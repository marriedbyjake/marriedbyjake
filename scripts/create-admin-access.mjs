// Local operator utility: create private first-sign-in/invitation links without email.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { createInviteToken, sendMagicLink } from "@emdash-cms/auth";

const config = JSON.parse(await fs.readFile("wrangler.jsonc", "utf8"));
let apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!apiToken) {
  // Reuse Wrangler's existing OAuth login; never print or persist its token.
  const credentials = await fs.readFile(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8");
  apiToken = credentials.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
}
if (!apiToken) throw new Error("Run wrangler login, or supply CLOUDFLARE_API_TOKEN with D1 access");
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${config.d1_databases[0].database_id}/query`;
const database = {
  prepare(sql) {
    return { bind(...params) { return { async all() {
      const response = await fetch(endpoint, {
        method: "POST", headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok || !result.success || result.result?.some((item) => !item.success)) {
        throw new Error(`D1 access failed (${response.status}); check the Cloudflare login and database permissions`);
      }
      return result.result[0];
    } }; } };
  },
};
// This utility issues simple auth reads/inserts, never schema changes or transactions.
const db = new Kysely({ dialect: new D1Dialect({ database }) });
try {
  const adapter = createKyselyAdapter(db);
  const josh = await adapter.getUserByEmail("josh@withers.co");
  if (!josh || josh.role !== 50 || josh.disabled) throw new Error("Josh's active administrator account is required");
  const siteUrl = config.vars.EMDASH_SITE_URL;
  let signInUrl;
  await sendMagicLink({
    baseUrl: siteUrl, siteName: "Married by Jake",
    // Capture the official recovery URL locally. No email is sent.
    email: async (message) => { signInUrl = message.text.match(/https:\/\/[^\s]+/)?.[0]; },
  }, adapter, josh.email, "recovery");
  if (!signInUrl) throw new Error("Could not create the sign-in link");
  const jake = await adapter.getUserByEmail("hello@marriedbyjake.com");
  const invitation = jake ? undefined : await createInviteToken(
    { baseUrl: `${siteUrl}/_emdash` }, adapter, "hello@marriedbyjake.com", 50, josh.id,
  );
  const directory = path.resolve(".emdash");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "access-links.txt");
  await fs.writeFile(filename, [
    `Created: ${new Date().toISOString()}`,
    "Treat these links as credentials; keep this file out of Git.",
    "", "Josh (josh@withers.co): sign in, then add a passkey in your own browser.",
    "Single use; expires in 15 minutes.", signInUrl,
    "", "Jake (hello@marriedbyjake.com): administrator invitation; register your own passkey.",
    invitation ? "Expires in seven days. Share this link privately with Jake." : "Jake already has an account; use his existing passkey.",
    invitation?.url || `${siteUrl}/_emdash/admin`,
  ].join("\n") + "\n", { mode: 0o600 });
  await fs.chmod(filename, 0o600);
  console.log(`Private access links saved to ${filename}`);
} finally { await db.destroy(); }
