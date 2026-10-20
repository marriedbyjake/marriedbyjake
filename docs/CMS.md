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

Save edits as drafts, then Publish. Saving a revision does not replace the published page. Publishing queues a complete Git release and Cloudflare static build; the editor banner and `/_publishing` show when it becomes live. Failed releases retain the last healthy website. See [publishing operations](PUBLISHING_SERVICE.md). Deleting an entry archives it in EmDash and queues removal in the next successful release. A signed preview can show draft content to its authorized viewer. Do not reuse slugs belonging to static routes such as `/contact` or `/faq`.

The wedding testimonials list is configured to show Venue through the live collection's `admin.listColumns: ["venue"]` setting. A blank venue helps identify Jake's unfinished historical backlog. New unfinished entries should be saved as drafts until ready to publish; adding this column does not change existing publication statuses. This display setting lives in D1, not the historical seed schema, and needs no Worker deployment.

Upload images through Media or the image picker; choose alt text appropriate to the entry. The 307 imported images use their original bytes and recorded dimensions. For a new testimonial venue, set map latitude and longitude to add it to the overview map. The detail map uses its venue and location text.

Email delivery is not configured. Passkeys and copied invitation links work; emailed passwordless login or recovery requires an email provider to be configured first. Keep an additional passkey on a second device. Never share accounts or commit access links.

## Cloudflare resources

Account: Withers Co (`60ef6bd2c48d5beb6fd6a093cff863cf`).

- CMS/private Worker: `marriedbyjake`
- Canonical public Worker: `marriedbyjake-public`, ASSETS plus CMS service binding only
- D1: `marriedbyjake-emdash` (`a9e0e146-602f-411c-b9d7-a46be3299f3a`)
- R2: `marriedbyjake-emdash-media` (private)
- Sessions: `marriedbyjake-session` KV (`8fa1ec227c9a446390a6299856e15f6e`)
- Images binding: `IMAGES`
- Scheduled EmDash maintenance: every minute
- Backend release/fallback hostname: https://marriedbyjake.withersco.workers.dev (production bindings, not isolated staging)

`wrangler.jsonc` defines CMS resources; `workers/public/wrangler.jsonc` defines public route ownership. Canonical/www traffic enters the small public Worker, which forwards private Requests unchanged to the existing CMS Worker. See [delivery operations](PUBLIC_DELIVERY.md). DNS remains in the same Cloudflare account; the public delivery cutover changed only the two existing Worker-route targets. The earlier DNS configuration below is dated deployment evidence: authoritative nameservers `armando.ns.cloudflare.com` and `celine.ns.cloudflare.com`, proxied apex `AAAA` → `100::`, proxied `www` CNAME → apex. The CMS entry retains EmDash fetch/scheduled handlers and its uninitialized-setup guard. Established accounts retain normal EmDash authentication.

Required secrets: `EMDASH_ENCRYPTION_KEY` (generate with `npx emdash secrets generate`) and `EMDASH_SETUP_PASSWORD` (random initial setup credential). Set them with `npx wrangler secret put <NAME>`. Store the encryption key securely; replacing it can invalidate encrypted settings. `.dev.vars` is local and ignored. `EMDASH_SITE_URL` is the public canonical URL, not a secret.

## Deployment and verification

Production runs only on Cloudflare Workers. Use Node 24 LTS and the coordinated hosted release procedure:

1. Run `npm ci`.
2. Run `npm run validate`, commit intended source, fetch/reconcile main and push without force.
3. Both main-branch Builds jobs validate independently. The CMS uses `npm run deploy:ci`; the public job waits for its matching CMS release, then uses `npm run deploy:public:ci`. Read their root-directory/command settings in [the delivery runbook](PUBLIC_DELIVERY.md). Local normal deployment requires genuine Cloudflare CI identity; do not fake it.
4. Verify both active versions/100% traffic, canonical source/hash and editor health. For operator read-only inspection, use normal Wrangler authentication and the explicit configuration for each Worker.
5. Run `npm run verify:seo -- --url https://marriedbyjake.com` to check rendered internal links, metadata, testimonial markup and the live sitemap.

A Git push triggers Builds but does not prove successful activation or public confirmation. Check `/`, a blog post, an image-bearing testimonial, `/serviceandprice`, `/wedding-readings`, `/search.json`, `/rss.xml`, `/sitemap-0.xml` and `/_emdash/admin` after a material change. Verify image bytes and actual editor/private-preview behavior. Never overwrite a real entry to test draft, publish or archival behavior.

Public HTML and content endpoints are committed static build artifacts. Private CMS, signed previews and authorized mutable-media responses use `private, no-store`; drafts never enter the public snapshot. Astro’s generated assets and successful image transforms of fingerprinted `/_astro/` sources retain immutable browser caching. CMS-media transforms remain private. Collection normalization is reused only within the current EmDash request, with separate arrays for callers; no published content or previews are retained across requests by this adapter. Redirect rules live in `src/data/redirects.json` with the shape `{ "redirects": [...] }`; `www` redirects to the canonical hostname. Public internal links omit trailing slashes except for `/`.

The initial custom-domain API request returned code `100117` (`hostname already has externally managed DNS records`). This did not establish that DNS was hosted outside Cloudflare. Wrangler’s current OAuth session can manage Worker routes but cannot list the zone’s DNS records; the authenticated Cloudflare dashboard was used to inspect and replace the old Vercel web targets. The five Google Workspace MX records and four TXT records were preserved. A private rollback snapshot of the two former web records is kept in `.emdash/web-dns-before-2026-10-02.json`, outside Git.

## Migration and recovery

`npm run cms:prepare` makes a **fresh local snapshot only** at `.emdash/import.db`, validates collection schemas, converts Markdown to Portable Text, creates media records and initializes media usage tracking. `scripts/upload-cms-media.py` uploads the hashed original media objects to the configured private R2 bucket. It verifies hashes before upload. `npm run cms:validate` validates `seed/seed.json`, which contains schema only, not live content.

Do not reimport the source snapshot over production after editors start working. It lacks current CMS edits, users and credentials. Back up the current D1 database and R2 media before migrations or destructive changes. D1 Time Travel/database exports protect content; Worker version rollback alone does not restore a database. Restoring the old Vercel site restores only its old Git content, not changes made in EmDash.

The source was fast-forwarded to GitHub `1470d44` before cutover: five testimonials were added and two existing testimonials updated through the CMS API, with published field/body read-back checks.

The initial import used D1’s query API after the bulk file importer returned `D1_RESET_DO` before importing data. Schema was created before data to satisfy revision foreign keys. EmDash’s authenticated activation endpoint installed D1 media capture triggers, and its repair endpoint verified all 655 content sources. Do not create triggers using concatenated SQL through the REST query API: its statement parser rejected those trigger bodies. Use the native EmDash activation/maintenance APIs.

The original `.pages.yml` is retained solely as migration reference. Pages CMS/Git edits to the archived Markdown do not publish to the new CMS.

## Website sections and menus (19 October 2026)

Use **Website → Website sections** for the homepage and five city introductions, About Jake, FAQs, service-and-price inclusions, shared values/statistics/steps, enquiry invitations, videos, photographs, contact embed, footer, and static-page search metadata. The 47 named entries use native labelled blocks rather than JSON or HTML. Expand the existing settings block, Save draft, preview the saved values, then Publish. Keep each named entry, slug and block type. Missing or invalid required sections stop publication and preserve the last healthy release.

**Menus** manages six connected menus: Explore navigation, Header shortcuts, Footer quick links, Footer social links, Footer featured links and Footer legal links. Reorder or rename items normally. Custom links and references to published posts/pages are supported. Nested links retain their ordering and appear as an ordered flat list in the existing design. A reference to private/unpublished content, unsafe URL or menu cycle stops the release. Menu and general site-setting saves have no draft stage; they queue the next full release.

General settings’ **Title**, **Tagline**, **Logo** and **Favicon** are exported through an exact public allowlist. Logo/favicon uploads must be JPEG, PNG or WebP; the publisher verifies and commits the selected original. The footer can select a separate logo. Business email, telephone and link labels are in the Footer and legal notice section. Hosting, domains, security, email delivery, analytics identifiers, payment/contact processing, visual layout and the 404 game remain technical settings. Native Widgets and Sections are not additional layout controls; the named Website sections are the supported editing surface.

For posts, testimonials, services, information pages and the aggregate Pricing entry, use the ordinary **Search title**, **Search description**, **Social preview image**, **Preferred canonical URL** and indexing fields. These are revision-managed and publish with the entry. Blank values retain the page’s existing defaults. Readings use the reading page’s shared metadata. A noindex page or canonical alias is omitted from the external sitemap; ordinary published content remains in site search and RSS. The owner’s direct-link pricing policy additionally excludes `/serviceandprice` and `/celebrantcost` from navigation, search and discovery feeds. `/celebrantcost` redirects to `/serviceandprice`; its CMS entry/revisions are preserved. The direct page always retains noindex metadata/headers, even if an editor clears its indexing checkbox. Canonical overrides must be HTTPS or a site-relative public path.

The native EmDash 1.1.0 SEO side panel stored values outside content revisions and was disconnected from this static publisher. Its table was empty before this change; the unused panel is disabled, with its table retained. Do not reconnect it by exporting draft side-table values. The new ordinary fields preserve draft isolation.

`/_publishing#editing` is the private editor guide. Website-section previews show saved values in a labelled preview; the published page keeps its existing layout. Preview media remains scoped to the signed entry. Native signed preview links are private bearer links valid for one hour: anyone holding the exact link can view that entry without signing in. Keep them private; unsigned, expired, tampered and different-entry requests are refused. Responses use private/no-store/noindex/no-referrer headers. Admin Live View links are corrected to each section’s real page by the same-origin publishing script, because the native collection URL pattern cannot represent these shared sections individually.

`node scripts/configure-website.mjs` prints the additive setup plan. `--apply` requires a privately stored existing editor session through `EMDASH_SESSION_FILE`; never commit that file or its contents. Take current native/full D1 backups and verify the media archive before applying. Existing entries are never rewritten by this setup. The new collection is seeded from existing public copy, with a sourced review excerpt and narrow typo/legal-witness corrections. Repeat setup only before owner edits; schema/menu differences require review rather than overwriting them.
