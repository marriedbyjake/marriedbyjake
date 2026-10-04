# Repository instructions

## Start here

Read [README.md](README.md) for the architecture and editing map, then the runbook relevant to the task: [CMS operations](docs/CMS.md), [hero video](docs/VIDEO.md), [vendor research](docs/VENDOR_LINKS.md) or [testimonial inline links](docs/TESTIMONIAL_INLINE_LINKS.md). Treat [project history](docs/PROJECT_HISTORY.md) as dated evidence, not a current deployment or content inventory.

Inspect `git status`, the branch, relevant diffs and current source before editing. Preserve unrelated work. When publishing source, fetch and integrate remote changes without discarding local work or force-pushing. Keep changes within the requested scope.

## Choose the correct editing surface

- Live blog posts, testimonials, services, readings, info pages and pricing belong in EmDash/D1. Editing Markdown under `src/content/` does not publish them; it is archive and migration source only. Do not reimport that archive over production.
- Layout, navigation, static landing-page copy and UI belong in `src/pages/`, `src/layouts/`, `src/components/` and `src/styles/`. Source changes require a Worker deployment.
- Check `src/data/seo.json` and `src/components/fundations/head/Seo.astro` when changing page titles or descriptions; route overrides can take precedence over CMS descriptions.
- Hero video URLs and matching posters are configured in `src/data/hero-video.ts`. Follow the video runbook and preserve decorative playback, poster fallback and reduced-motion behavior.
- Worker bindings/routes belong in `wrangler.jsonc`; preserve the Astro Cloudflare/EmDash integration in `astro.config.mjs` and the custom entry in `src/worker.ts`.

## EmDash content contract

The site renders published content from D1 per request. `src/live.config.ts` registers the EmDash live loader. Public templates read through `getCollection()` and `getEntry()` in `src/lib/cms.ts`, which normalize CMS fields, media and canonical content links. Keep the collection slugs `posts`, `weddingtestimonials`, `services`, `readings`, `infopages` and `pricing` consistent with the live model. Rich content uses Portable Text, not archived Markdown rendering.

For content edits, use the authenticated CMS, preserve the existing slug unless a URL change is intended, save a draft, review, then Publish. A draft revision must leave the published page intact; signed previews remain restricted to their authorized viewer. Publishing updates relevant pages, search, RSS and sitemap without rebuilding. Do not expose drafts by loosening collection filters or preview checks. Do not invent copy, reviews, pricing, credentials or vendor identities. Never overwrite a real entry merely to test publishing.

Use CMS Media for uploaded images, preserve appropriate alt text, and edit testimonial map latitude/longitude in the CMS. Avoid slugs belonging to static routes such as `/contact` and `/faq`.

`seed/seed.json` is a schema-only migration reference. `npm run cms:validate` checks that file; it does not check or synchronize production D1. `npm run cms:prepare` recreates a local historical import snapshot and migration files. Neither command publishes ordinary edits. Schema changes require checking the current live model and following the CMS migration/recovery runbook.

## Testimonial formatting and links

Formatting belongs in `src/lib/testimonial-format.ts` and `src/components/testimonials/TestimonialContent.astro`. Preserve review words and published CMS revisions. Render credits separately and retain reviewed boundary exceptions in `src/data/testimonial-credit-boundaries.json`.

Internal testimonial links must use natural phrases already in the quote. Keep reviewed selections in `src/data/testimonial-inline-links.json`, with rendering in `src/lib/testimonial-inline-links.ts`. Do not add a planning/info box or a list of all location links beneath a quote. Preserve existing links and text emphasis.

Keep verified vendor websites in `src/data/testimonial-vendors.json` and confirmed unavailable links in `src/data/unavailable-vendor-urls.json`. Keep vendor names when a website cannot be verified; do not guess domains. Record research and unavailable historical URLs in `docs/VENDOR_LINKS.md`, and update selection rationale in `docs/TESTIMONIAL_INLINE_LINKS.md` when it changes.

Run `npm run test:content` after formatting, link-normalization, vendor mapping or inline-link changes. Inspect representative rendered reviews to confirm wording, credit boundaries and link placement.

## Routes and visual styling

Preserve redirect rules in `src/data/redirects.json`, with the shape `{ "redirects": [...] }`. `src/middleware.ts` handles historical redirects, `www` canonicalization and public trailing slashes; `src/lib/internal-links.ts` normalizes CMS links. Public internal links omit a trailing slash except the homepage `/`. Retain query strings/fragments and existing redirects when changing handling.

Use square corners for public cards, panels, image containers and buttons. Preserve circular icons and pagination indicators. Keep the established palette, typography, layout and accessibility behavior when making a narrow fix. Check affected UI at desktop and mobile sizes.

## Local development and validation

Use Node 24 LTS, version 24.15 or newer, and locked dependencies from `npm ci`. Create `.dev.vars` from `.dev.vars.example` only if it is missing; configure local values privately and preserve existing local credentials. Start Astro with `npm run dev`.

Local Wrangler state does not mirror production D1/R2. A fresh checkout may lack CMS content and media. Do not point local experiments at production or reimport production merely to resolve missing development data. The `marriedbyjake.withersco.workers.dev` hostname uses the same production bindings as the canonical site and is not isolated staging.

- `npm run validate` runs content tests, binding type generation, Astro diagnostics and the production build.
- `npm run types` regenerates binding types after `wrangler.jsonc` changes; the check script also runs it.
- `npm run cms:validate` validates the seed schema when it changes.
- `npm run verify:seo -- --url <running-site-url>` checks rendered output. SSR pages are not static HTML in `dist/`.

For documentation-only edits, check paths, links and command names against the source; a Worker deployment is unnecessary unless requested. Do not claim a build, publication or deployment was verified when only documentation was checked.

## Production deployment

Cloudflare Workers is the only production deployment target. Do not configure another hosting provider as production. Use Node 24 LTS and the configured Withers Co account/Worker `marriedbyjake`; `wrangler.jsonc` is the resource and route source of truth.

Commit and push intended source changes to `main` separately from deployment. A Git push does not deploy the Worker. Reconcile remote work before release, confirm the deployed checkout matches the intended `main` revision and preserve unrelated changes. Deploy from a fresh build of that revision, not an older `dist/`.

1. Install dependencies with `npm ci`.
2. Authenticate with `npx wrangler login --device --browser=false`. Keep the command active and approve its verification URL in the browser within five minutes. Restart the flow if the code expires. Confirm account access with `npx wrangler whoami`; keep authentication codes and credentials private.
3. Run `npm run deploy`. This runs the required content tests, type checks and build before `wrangler deploy`. Optionally annotate with `npm run deploy -- --message "main COMMIT: change description"`, using the actual commit.
4. Check the active deployment with `npx wrangler deployments list`. Confirm the intended version and traffic allocation, not merely upload success.
5. Verify the canonical site with `npm run verify:seo -- --url https://marriedbyjake.com`.

After a material change, smoke-test home, a blog post, an image-bearing testimonial, pricing, readings, search JSON, RSS, sitemap and CMS sign-in. Check canonical/historical redirects and image bytes, and browser-test affected UI. Do not create or publish disposable production content without task authorization.

Report source commit/remote parity, Worker version/active traffic, validation and canonical live behavior separately. State verification gaps clearly. Append dated evidence to `docs/PROJECT_HISTORY.md` and keep the README/runbooks current when architecture or workflow changes.

## Credentials, media and recovery

EmDash uses D1 `DB`, private R2 `MEDIA`, KV `SESSION` and Cloudflare Images `IMAGES`. The custom Worker delegates fetch and scheduled maintenance to EmDash and retains the setup guard for an uninitialized CMS. Do not bypass that guard or normal CMS authentication.

Keep credentials, access links, secret values and private rollback data out of Git, logs and responses. Production values go in Wrangler secrets. Preserve `EMDASH_ENCRYPTION_KEY`; replacing it can invalidate encrypted settings. `.env`, `.dev.vars`, `.emdash/`, Wrangler credentials and generated local state remain private/ignored. `PUBLIC_GOOGLE_MAPS_API_KEY` is build-time browser configuration; preserve its canonical-domain restrictions.

`npm run cms:access` creates private production recovery/invitation credentials; use it only for an authorized access/recovery task, not routine deployment. Passkeys and copied private links are documented in `docs/CMS.md`; do not assume email sign-in/recovery delivery is configured.

Back up current D1 and R2 before schema migrations or destructive changes. Worker rollback restores code, not database/media state. Historical Markdown/import snapshots lack later CMS edits and account data and must never substitute for a current backup. Follow [CMS operations](docs/CMS.md) for recovery and migration procedures.
