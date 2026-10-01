# Project history

## 2026-10-01 — EmDash and Cloudflare Workers migration

Moved the site architecture from Vercel/static Markdown to Astro server rendering with EmDash 1.0.1 on Workers, D1 and R2. Imported all six collections: 655 entries and 307 images. Public templates preserve their original paths, redirects, styling and content; pricing, readings, search, RSS and sitemap now read published CMS data. Existing testimonial coordinates were copied into editable CMS fields. Added separate administrator access for Josh and an invitation for Jake.

Validation: Astro diagnostics and production build; dependency audit; local draft 404, publish 200, private draft revision, republish visibility and archive 404; authenticated production content reads and complete media usage repair for all 655 sources. Corrected imported media storage-key references and optional featured-image rendering. Detailed deployment and canonical smoke-test evidence is appended once verified.

Operational details: [CMS runbook](CMS.md). Source Markdown remains an archive. Generated Astro files and private credentials are excluded from the migration commit.

GitHub reconciliation: fetched and fast-forwarded from `02e6078` to `1470d44` (11 commits). Imported five new testimonials and updated `jo-and-fin` and `haylie-and-dean`, including the 1 October edit. The final source count is 613 testimonials and 655 entries overall. Existing CMS IDs and user accounts were retained.

Live verification: Worker version `95fc3dee-2bb6-482c-924b-704192e4ffdc` received 100% traffic via `marriedbyjake.com/*` and `www.marriedbyjake.com/*`. All 656 sitemap URLs returned 200; search contained 642 public entries; canonical redirects, admin sign-in and production dev-bypass rejection passed. All 307 R2 originals matched their source SHA256; optimized CMS images returned 200. Final media repair covered all 655 sources. Astro check reported zero errors, warnings and hints, the production build passed, and npm audit reported zero vulnerabilities.

Custom-domain activation was rejected because the web DNS records are externally managed. Full-site Worker routes completed the cutover while retaining those records; see the runbook before retiring the old DNS connection. GitHub was fetched again after reconciliation and remained at `1470d44`. Access uses passkeys and private copied links; email delivery is not configured.
