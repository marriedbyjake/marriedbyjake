# Project history

## 2026-10-07 - Testimonial administrator venue column

Enabled the existing `venue` field as a wedding testimonial list column using EmDash's supported collection `admin.listColumns` configuration. Inspected the live collection and field first: `admin_config` was null and `venue` was a string field. A guarded D1 update changed only that collection's display configuration to `{"listColumns":["venue"]}`; read-back confirmed one changed row and the saved value. Testimonial content and publication statuses were not edited.

Validation: checked the installed EmDash manifest handler and collection configuration contract, and verified the production D1 setting. No authenticated browser session was available, so the rendered administrator list was not visually verified. Documentation-only source edits; no build, Git push or Worker deployment was performed.

2026-10-08 follow-up: reconciled the documentation with current remote `main` for source publication. `git diff --check` passed. A fresh production D1 read-back was denied by Cloudflare with authorization error 7403; the last successful setting verification remains 7 October. This documentation publication needs no Worker deployment.

## 2026-10-01 — EmDash and Cloudflare Workers migration

Moved the site architecture from Vercel/static Markdown to Astro server rendering with EmDash 1.0.1 on Workers, D1 and R2. Imported all six collections: 655 entries and 307 images. Public templates preserve their original paths, redirects, styling and content; pricing, readings, search, RSS and sitemap now read published CMS data. Existing testimonial coordinates were copied into editable CMS fields. Added separate administrator access for Josh and an invitation for Jake.

Validation: Astro diagnostics and production build; dependency audit; local draft 404, publish 200, private draft revision, republish visibility and archive 404; authenticated production content reads and complete media usage repair for all 655 sources. Corrected imported media storage-key references and optional featured-image rendering. Detailed deployment and canonical smoke-test evidence is appended once verified.

Operational details: [CMS runbook](CMS.md). Source Markdown remains an archive. Generated Astro files and private credentials are excluded from the migration commit.

GitHub reconciliation: fetched and fast-forwarded from `02e6078` to `1470d44` (11 commits). Imported five new testimonials and updated `jo-and-fin` and `haylie-and-dean`, including the 1 October edit. The final source count is 613 testimonials and 655 entries overall. Existing CMS IDs and user accounts were retained.

Live verification: Worker version `95fc3dee-2bb6-482c-924b-704192e4ffdc` received 100% traffic via `marriedbyjake.com/*` and `www.marriedbyjake.com/*`. All 656 sitemap URLs returned 200; search contained 642 public entries; canonical redirects, admin sign-in and production dev-bypass rejection passed. All 307 R2 originals matched their source SHA256; optimized CMS images returned 200. Final media repair covered all 655 sources. Astro check reported zero errors, warnings and hints, the production build passed, and npm audit reported zero vulnerabilities.

Custom-domain activation returned API error `100117` about externally managed DNS records. Full-site Worker routes completed the cutover while retaining the old web targets. GitHub was fetched again after reconciliation and remained at `1470d44`. Access uses passkeys and private copied links; email delivery is not configured.

## 2026-10-02 — Cloudflare DNS verification and Vercel target removal

Verified the active full Cloudflare zone and its authoritative nameservers, `armando.ns.cloudflare.com` and `celine.ns.cloudflare.com`. Corrected the initial handover’s claim that DNS management needed to move from Vercel: DNS was already hosted in Cloudflare. The dashboard showed an apex `A` record pointing to `216.198.79.1` and a `www` CNAME pointing to `acf635e0c1fa611e.vercel-dns-017.com`, both proxied. Replaced the apex with a proxied `AAAA` record pointing to the reserved `100::` placeholder, and changed the `www` CNAME to `marriedbyjake.com`. The full-site Worker routes remain in place; no Vercel origin is required. Kept a private rollback snapshot and preserved all five MX and four TXT records.

Validation: read back the saved web records in the authenticated Cloudflare dashboard, then checked canonical home, testimonial, pricing, readings, search, sitemap and administrator sign-in responses. The `www` testimonial URL redirects to the canonical hostname and includes Jake’s latest copy. Search has 642 published entries and the sitemap has 656 URLs. These DNS/documentation changes do not modify the deployed Worker code from commit `88eed4b`.

## 2026-10-02 — Main reconciliation and CMS testimonial rendering

Fetched GitHub through `2a8e5d0`, which merges the testimonial/SEO update `8157c2f` and the complete Workers/CMS branch through `c2c9146`. The checkout is now on `main`. Adapted the merged testimonial quote and wedding-team layout to render from current CMS Portable Text, including existing vendor paragraphs and future structured entries. Review schema text excludes the wedding-team section. Production content remains authoritative; no archived Markdown was reimported.

Validation: Node 24.21.0; Astro check returned zero errors, warnings and hints; production build passed; CMS seed schema validation passed; dependency audit reported zero vulnerabilities. The rendered SEO checker passed against all 651 sitemap pages in the local development snapshot, including 608 testimonials, internal links, metadata, quote markup and location-page inlinks. Browser inspection confirmed the merged quote and wedding-team layout. Production checks use the live CMS inventory independently of this older local snapshot.

Production verification: application commit `d2adf31631b6a9c467bbf65538e7b3923b7c8671` was pushed to `main` and deployed as Worker version `e7a71a92-0194-49cb-b906-ebc5fadf7a90`, confirmed at 100% traffic. `npm run verify:seo -- --url https://marriedbyjake.com` passed for all 656 sitemap pages and 613 published testimonials, including internal-link responses, metadata, quote markup and location inlinks. Search contained 642 entries. Canonical home, blog, testimonial, pricing, readings, RSS, XML sitemap, agent-discovery text and the Workers hostname returned 200. The `www` testimonial URL redirected to the canonical hostname; the CMS administrator route redirected to the working passkey sign-in page. A production testimonial image returned 200 as WebP (25,242 bytes), and its stylesheet loaded successfully. Browser inspection confirmed the updated live review and five wedding-team cards, retained 1 October content, and CMS sign-in. All local and remote branch commits were ancestors of `main`; the application release checkout matched GitHub and had no uncommitted files.

## 2026-10-02 — Website editing and agent documentation

Expanded the README and agent instructions with an editing map, the EmDash runtime and draft/publish model, local setup, testimonial rules, production resources, and the complete Workers deployment and live-verification procedure. Clarified that archived Markdown is not live content, Git publication and Worker deployment are separate, the Workers hostname shares production bindings, and historical import snapshots are not current CMS backups. Linked the specialist CMS, video, vendor and inline-link runbooks.

Validation: checked documented npm commands against `package.json`, local file links and source paths, code fences, redirect format, deployment validation chain, and Worker bindings/routes against current configuration. Verified the device-login instructions against official Cloudflare documentation. Documentation-only change; no application build, CMS mutation or Worker deployment was performed for this update.

## 2026-10-09 — IndexNow deployment submission

Added the canonical site's root IndexNow verification file, public verification configuration and `npm run indexnow`. The npm `postdeploy` hook submits the current published sitemap after successful `npm run deploy`; ordinary local builds and CMS-only publications do not submit. The script verifies the deployed key, rejects foreign/noncanonical URLs, deduplicates and batches up to 10,000 URLs, accepts HTTP 200/202 and reports failures for manual retry without implying a Worker rollback.

Validation: installed locked dependencies with Node 24.21.0; `npm run validate` passed (content tests, binding generation, Astro diagnostics with zero errors/warnings/hints, and production build). Mocked submission checks passed for accepted responses, duplicates, invalid keys, foreign URLs, rate limits and dry runs. Production deployment and initial submission remain pending Cloudflare device authentication; no new Worker version or live IndexNow acceptance has been verified.
