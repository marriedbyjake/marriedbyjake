# CMS operations

## Editing

Open https://marriedbyjake.com/_emdash/admin and sign in with a passkey. Josh (`josh@withers.co`) and Jake (`hello@marriedbyjake.com`) use separate administrator accounts. Initial access links are saved outside Git in `.emdash/access-links.txt`; they must be treated as credentials. Register a passkey in your own browser/device after first sign-in. Invitations expire in seven days; recovery links expire in fifteen minutes and are single use. An administrator can create invitations from Users and copy the link. No invitation emails were sent during migration. If the initial sign-in link expires, run `npm run cms:access` from this checkout while authenticated with Wrangler; it creates fresh private links without sending mail.

The six collections preserve the existing content:

| Collection | Migrated entries | Public location |
| --- | ---: | --- |
| Blog posts | 22 | `/blog/<slug>` |
| Wedding testimonials | 613 | `/weddingtestimonials/<slug>` |
| Services | 4 | `/<slug>` and `/services` |
| Wedding readings | 12 | `/wedding-readings` |
| Info pages | 3 | `/<slug>` |
| Pricing | 1 | `/serviceandprice` |

Save edits as drafts, then Publish. Saving a revision does not replace the published page. Publishing updates the site, search, RSS and sitemap immediately, without rebuilding. Deleting an entry archives it in EmDash and removes it from public pages. A signed preview can show draft content to its authorized viewer. Do not reuse slugs belonging to static routes such as `/contact` or `/faq`.

Upload images through Media or the image picker; choose alt text appropriate to the entry. The 307 imported images use their original bytes and recorded dimensions. For a new testimonial venue, set map latitude and longitude to add it to the overview map. The detail map uses its venue and location text.

Email delivery is not configured. Passkeys and copied invitation links work; emailed passwordless login or recovery requires an email provider to be configured first. Keep an additional passkey on a second device. Never share accounts or commit access links.

## Cloudflare resources

Account: Withers Co (`60ef6bd2c48d5beb6fd6a093cff863cf`).

- Worker: `marriedbyjake`
- D1: `marriedbyjake-emdash` (`a9e0e146-602f-411c-b9d7-a46be3299f3a`)
- R2: `marriedbyjake-emdash-media` (private)
- Sessions: `marriedbyjake-session` KV (`8fa1ec227c9a446390a6299856e15f6e`)
- Images binding: `IMAGES`
- Scheduled EmDash maintenance: every minute
- Preview: https://marriedbyjake.withersco.workers.dev

`wrangler.jsonc` is the resource and routing source of truth. Full-site Worker routes handle both proxied hostnames. DNS is hosted in the same Cloudflare account, with authoritative nameservers `armando.ns.cloudflare.com` and `celine.ns.cloudflare.com`. The apex uses a proxied `AAAA` record pointing to `100::`, and `www` uses a proxied `CNAME` pointing to `marriedbyjake.com`. This is Cloudflare’s [documented placeholder configuration for an originless Worker route](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/#set-up-custom-domains-or-routes-correctly); the website has no Vercel origin dependency. The custom Worker entry uses EmDash’s fetch and scheduled handlers. A temporary setup Basic-auth gate protects an empty database until setup is complete and an administrator exists; established accounts use EmDash authentication.

Required secrets: `EMDASH_ENCRYPTION_KEY` (generate with `npx emdash secrets generate`) and `EMDASH_SETUP_PASSWORD` (random initial setup credential). Set them with `npx wrangler secret put <NAME>`. Store the encryption key securely; replacing it can invalidate encrypted settings. `.dev.vars` is local and ignored. `EMDASH_SITE_URL` is the public canonical URL, not a secret.

## Deployment and verification

1. Use supported Node 24 LTS and run `npm ci`. The check script regenerates binding types automatically, including on a fresh checkout. As checked on 2 October 2026, Astro 7.3.5 and EmDash 1.1.0 are current stable releases. TypeScript stays on 6.0.3 because the latest Astro checker supports TypeScript 5 and 6; upgrade it to 7 only when that peer requirement supports it.
2. Run `npm run types` after binding changes, then `npm run validate` and `npm audit`.
   Run `npm run verify:seo -- --url <site-url>` against a running local or deployed site to check rendered internal links, metadata, testimonial markup and the live sitemap. The checker accepts a URL because Workers pages are rendered from D1 rather than emitted as static HTML.
3. Deploy with `npx wrangler deploy --message '<change description>'`.
4. Verify the active version with `npx wrangler deployments list`.
5. Check `/`, a blog post, a testimonial with an image, `/serviceandprice`, `/wedding-readings`, `/search.json`, `/rss.xml`, `/sitemap-0.xml`, and `/_emdash/admin` on the canonical hostname. Verify a loaded image’s actual bytes/HTTP status and use the browser to check the editor.
6. A disposable draft should return 404 anonymously, Publish should make it visible, a saved draft revision should leave the published version intact, and archival should return 404 again. Never overwrite a real entry merely to test.

HTML and content endpoints use `private, no-store` so draft previews are never shared and publications are immediately visible. Astro’s generated assets remain immutable. Original Vercel redirects are applied by Astro middleware; `www` redirects to the canonical hostname. Keep the current proxied placeholder/alias records in place while using Worker routes. No DNS-provider or nameserver transfer is required. Worker custom domains are an alternative routing configuration; migrate the web records and route configuration together if adopting them. Future deployment is manual; the existing Vercel integration does not deploy this Worker.

The initial custom-domain API request returned code `100117` (`hostname already has externally managed DNS records`). This did not establish that DNS was hosted outside Cloudflare. Wrangler’s current OAuth session can manage Worker routes but cannot list the zone’s DNS records; the authenticated Cloudflare dashboard was used to inspect and replace the old Vercel web targets. The five Google Workspace MX records and four TXT records were preserved. A private rollback snapshot of the two former web records is kept in `.emdash/web-dns-before-2026-10-02.json`, outside Git.

## Migration and recovery

`npm run cms:prepare` makes a **fresh local snapshot only** at `.emdash/import.db`, validates collection schemas, converts Markdown to Portable Text, creates media records and initializes media usage tracking. `scripts/upload-cms-media.py` uploads the hashed original media objects to the configured private R2 bucket. It verifies hashes before upload. `npm run cms:validate` validates `seed/seed.json`, which contains schema only, not live content.

Do not reimport the source snapshot over production after editors start working. It lacks current CMS edits, users and credentials. Back up the current D1 database and R2 media before migrations or destructive changes. D1 Time Travel/database exports protect content; Worker version rollback alone does not restore a database. Restoring the old Vercel site restores only its old Git content, not changes made in EmDash.

The source was fast-forwarded to GitHub `1470d44` before cutover: five testimonials were added and two existing testimonials updated through the CMS API, with published field/body read-back checks.

The initial import used D1’s query API after the bulk file importer returned `D1_RESET_DO` before importing data. Schema was created before data to satisfy revision foreign keys. EmDash’s authenticated activation endpoint installed D1 media capture triggers, and its repair endpoint verified all 655 content sources. Do not create triggers using concatenated SQL through the REST query API: its statement parser rejected those trigger bodies. Use the native EmDash activation/maintenance APIs.

The original `.pages.yml` is retained solely as migration reference. Pages CMS/Git edits to the archived Markdown do not publish to the new CMS.
