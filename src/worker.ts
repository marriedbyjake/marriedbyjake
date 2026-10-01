import handler, { createScheduledHandler } from "@emdash-cms/cloudflare/worker";
import { timingSafeEqual } from "node:crypto";
import type { ExportedHandler } from "@cloudflare/workers-types";

type CmsWorkerEnv = Env & {
  EMDASH_SETUP_PASSWORD?: string;
};

export default {
  ...handler,
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    const needsSetupGuard = pathname.startsWith("/_emdash/admin")
      || pathname.startsWith("/_emdash/api/setup")
      || pathname.startsWith("/_emdash/api/auth");
    if (needsSetupGuard) {
      const row = await env.DB.prepare(
        "SELECT value FROM options WHERE name = 'emdash:setup_complete' AND EXISTS (SELECT 1 FROM users)",
      ).first<{ value: string }>();
      if (row?.value !== "true" && row?.value !== '"true"') {
        if (!env.EMDASH_SETUP_PASSWORD) return new Response("CMS setup access is being configured", { status: 503 });
        const encoder = new TextEncoder();
        const actual = encoder.encode(request.headers.get("Authorization") || "");
        const expected = encoder.encode(`Basic ${btoa(`setup:${env.EMDASH_SETUP_PASSWORD}`)}`);
        if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) {
          return new Response("Setup credentials required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Jake CMS setup", charset="UTF-8"', "Cache-Control": "private, no-store" },
          });
        }
      }
    }
    return handler.fetch!(request, env, ctx);
  },
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler<CmsWorkerEnv>;
