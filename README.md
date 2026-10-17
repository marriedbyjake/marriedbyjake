# Married by Jake

Jake’s website runs in the existing Withers Co Cloudflare account. The small `marriedbyjake-public` Worker serves committed public assets and forwards private editor requests to the existing `marriedbyjake` Worker. EmDash retains authoring data, drafts, revisions and media there. Its publisher commits complete published content and referenced images to Git; coordinated hosted builds deploy the exact commit. See [public delivery](docs/PUBLIC_DELIVERY.md) and [publishing operations](docs/PUBLISHING_SERVICE.md) for build gates and rollback. The Jake-owned account move is deferred.

- [Website](https://marriedbyjake.com)
- [EmDash editor](https://marriedbyjake.com/_emdash/admin)
- [Agent instructions](AGENTS.md)
- [CMS operations, access and recovery](docs/CMS.md)

Use Node 24 LTS, version 24.15 or newer. The project uses Astro, Tailwind CSS, React and EmDash; `package.json` and `package-lock.json` record the supported dependencies.

## Choose where to make the change

| Change | Source of truth | How it reaches the website |
| --- | --- | --- |
| Blog posts, testimonials, services, readings, info pages and pricing | EmDash editor / production D1 | Save a draft, review, then Publish; the Cloudflare publisher commits a release and Builds deploys it |
| Page structure, navigation, static landing-page copy and components | `src/pages/`, `src/layouts/`, `src/components/` | Validate, commit and push to `main`, then deploy the Worker |
| Public styling | `src/styles/` and component styles | Deploy the Worker; preserve the existing design and square corners |
| Titles and descriptions | Page/layout props, `src/components/fundations/head/Seo.astro`, `src/data/seo.json` | Check route-specific overrides as well as CMS fields, then deploy source changes |
| Testimonial quote formatting and wedding-team presentation | `src/lib/testimonial-format.ts`, `src/components/testimonials/TestimonialContent.astro` | Run `npm run test:content`, then deploy the renderer |
| Natural links inside testimonial quotes | `src/lib/testimonial-inline-links.ts`, `src/data/testimonial-inline-links.json` | Preserve existing review words; test and deploy |
| Verified vendor websites and unavailable links | `src/data/testimonial-vendors.json`, `src/data/unavailable-vendor-urls.json` | Record research in `docs/VENDOR_LINKS.md`, test and deploy |
| Redirects and canonical internal links | `src/data/redirects.json`, `src/middleware.ts`, `src/lib/internal-links.ts` | Preserve existing redirect rules, test and deploy |
| Homepage background videos and matching posters | `src/data/hero-video.ts` and poster assets | Follow [the video runbook](docs/VIDEO.md), then deploy |
| Worker bindings, routes and runtime configuration | `wrangler.jsonc`, `workers/public/wrangler.jsonc`, `src/public-worker.ts`, `src/worker.ts`, `src/cms-worker.ts`, `astro.config.mjs` | Regenerate types, validate and release through the coordinated Builds jobs |

Markdown under `src/content/` is the original migration source and an archive. Editing it does not publish content. The old `.pages.yml` is migration reference only. Never reimport archived content over production to apply an ordinary edit.

## How EmDash works here

`astro.config.mjs` prerenders public pages from `content/published/` through `src/content.config.ts` and `src/lib/cms.ts`. `src/live.config.ts` and `cms-live.ts` retain the EmDash loader for private signed previews. Rich content remains complete Portable Text; the published image/gallery renderers resolve verified assets from Git. The Worker serves public assets before EmDash or D1.

Canonical traffic enters `src/public-worker.ts`, whose complete upload is 12,218 bytes. It serves public assets and forwards canonical CMS/preview/media/publishing requests through the CMS service binding. `src/worker.ts` retains the complete public fallback and lazily loads `src/cms-worker.ts` for private/scheduled work in the original Worker. Keep both boundaries: postbuild checks the backend fallback graph, separately bundles the entire public upload below 32 KiB, and tests every canonical document plus private service forwarding in native workerd. See [delivery operations](docs/PUBLIC_DELIVERY.md) and dated [performance evidence](docs/PERFORMANCE.md).

The earlier [public delivery pilot](docs/PUBLIC_DELIVERY_PILOT.md) remains a fixed, noindex experiment without CMS access; it is not production or an automatic publication target. Its evidence led to the approved production delivery layer. `npm run build:public-pilot` and `npm run test:public-pilot` remain optional diagnostic commands. Ordinary publishing uses the two guarded main-branch Builds jobs and retains the last healthy public version on failure.

| CMS collection slug | Content | Public route |
| --- | --- | --- |
| `posts` | Blog posts | `/blog/<slug>` |
| `weddingtestimonials` | Couple reviews, venue, rating, images and map coordinates | `/weddingtestimonials/<slug>` |
| `services` | Service descriptions | `/<slug>` and `/services` |
| `readings` | Readings, poems and blessings | `/wedding-readings` |
| `infopages` | Information pages | `/<slug>` |
| `pricing` | Australian ceremonies, international ceremonies and MC pricing | `/serviceandprice` |

To edit content, sign in at the editor with your own passkey, choose the collection and entry, save a draft, review it, then Publish. A saved draft revision leaves the published version intact. Publishing queues a Git release and a static build. The editor banner and `/_publishing` show pending/failure/retry status; a CMS save is separate from a confirmed live release. Export, conflict and build failures retain the last healthy website. Signed previews are for authorized viewers; ordinary public requests must not expose drafts. Archiving an entry queues its removal in the next successful release. Avoid slugs reserved by static pages, such as `/contact` and `/faq`.

Use the CMS Media picker for uploaded images and supply appropriate alt text. Testimonial overview-map positions come from the CMS latitude and longitude fields. The detail map also uses venue and location text. Local source images and public assets remain separate from CMS uploads.

Josh and Jake use separate administrator accounts. Passkeys and private copied invitation/recovery links are the documented access method; email delivery is not configured in the runbook. Follow [CMS operations](docs/CMS.md) for account recovery. `npm run cms:access` creates production access credentials in an ignored private file; it is an operator recovery action, not a development or deployment prerequisite.

The testimonial directory renders 24 reviews per page, preserving featured-first, image-first and date ordering. Numbered links reach every directory page directly, alongside previous/next links. Each page has its own canonical query URL and is included in the live sitemap; page one uses `/weddingtestimonials` without a query. The location map appears on the first page and loads as it approaches the viewport.

Map popups list the full testimonial links for reviews with the same explicit venue and location metadata. Case and whitespace differences are normalized; venue aliases and matching coordinates alone do not establish an association. Primary review links stay on this website. Directions remain an optional, labelled Google Maps link opening in a new tab. Venues without a usable review slug fall back to the general review directory. Popup lists are bounded and scrollable, with keyboard-accessible markers and focus requested when a popup opens. Only compact slugs and couple names are serialized; no review bodies, images or per-review database queries are added.

`ContextualReviews.astro` shows up to three short review excerpts on the five city landing pages and the wedding celebrant, MC and elopement service pages. City matches require an explicit city name in the published CMS location field. Service matches reuse reviewed inline-link selections only while their phrases remain in the current quote. Vendor credits never establish a match. The component links to the full testimonials and falls back to the general directory when none match. See [selection notes](docs/TESTIMONIAL_INLINE_LINKS.md) for maintenance rules. It uses the existing request-scoped collection cache and adds no browser JavaScript or per-review database reads.

Review rich text and plain text are normalized lazily, once per entry within the current request. Ratings, map metadata and card selection do not process unused review bodies. Public review/service images use verified committed originals through Astro’s build-time image pipeline, preserving focal metadata. Private preview media stays authenticated and cannot enter public build output.
The narrow canonical CMS-file image allowlist supports private previews. Original files and transform aliases pass the same authorization check; public pages use committed assets. Do not broaden it to unrelated hosts or API routes.

`src/lib/pricing.ts` reads the committed published `pricing/index` snapshot from EmDash. The pricing page and reusable `PricingReference.astro` on FAQ, services and cost pages share that source; archived Markdown is not the live price source. Complete CMS price strings are preserved. Conflicting GST/travel inclusion prose remains pending an owner decision; see [performance and pricing notes](docs/PERFORMANCE.md).

### Testimonial editing rules

Preserve the couple’s review wording. Format live Portable Text in the renderer instead of rewriting archived Markdown. Keep credits separate from the quote and use `src/data/testimonial-credit-boundaries.json` for reviewed exceptions.

Internal links must use natural phrases already present in the quote. Keep reviewed selections in `src/data/testimonial-inline-links.json`; see [selection notes](docs/TESTIMONIAL_INLINE_LINKS.md). Do not add a planning box or a list of all location links beneath a testimonial. Verify vendor websites before adding them, retain names when a website cannot be matched, and document unavailable historical URLs in [vendor notes](docs/VENDOR_LINKS.md). Run `npm run test:content` after formatting, vendor-link or link-normalization changes.

## Local development

Run these commands from the repository root with Node 24 LTS:

```sh
node --version
npm ci
```

If `.dev.vars` does not already exist, copy `.dev.vars.example` to it and configure local values privately. Never overwrite existing credentials or copy production credentials into documentation. Then start Astro:

```sh
npm run dev
```

Local Worker bindings use local Wrangler state; a fresh checkout does not mirror production D1 or R2. CMS-driven pages require local content and media, so the local inventory can differ from production. Do not repair an empty local database by replacing production data. [CMS operations](docs/CMS.md) explains the historical snapshot tools and their limitations.

`PUBLIC_GOOGLE_MAPS_API_KEY` is a build-time value used by the testimonial overview map's Maps JavaScript API loader. Keep the existing value in the ignored `.env`, with Google API restrictions for the canonical domain and Maps JavaScript API. Testimonial detail iframes use the existing keyless Google Maps embed URL, independently of that key. Builds no longer invoke the old geocoder; its cache is retained as migration reference.

| Command | Purpose |
| --- | --- |
| `npm run test:content` | Check testimonial wording, links, pagination, request isolation and image caching |
| `npm run types` | Regenerate Worker binding types after configuration changes |
| `npm run check` | Regenerate types and run Astro diagnostics |
| `npm run validate` | Run content tests, Astro diagnostics and the production build |
| `npm run indexnow` | Submit the live sitemap to IndexNow; automatically runs after successful `npm run deploy` |
| `npm run cms:validate` | Validate the schema-only `seed/seed.json`; does not validate production content |
| `npm run verify:seo -- --url http://localhost:4321` | Check rendered pages on a running local server; use its actual URL/port |

`npm run cms:prepare` recreates `.emdash/import.db` from the archive and writes migration files. It is not part of routine development or deployment and is not a current production backup. Never use that snapshot to overwrite live CMS content, users or credentials.

## Deploy to Cloudflare Workers

Use the existing Withers Co `marriedbyjake` Worker and configured resources. Normal production releases run in Cloudflare Builds from `main`, with Node 24.21.0, `npm ci && npm run validate`, then `npm run deploy:ci`. The gate verifies the exact CI/checkout SHA, clean source, release manifest, current Git main and an exclusive deployment lease. It preserves runtime variables. Local `npm run deploy` intentionally rejects a missing Cloudflare CI identity.

Fetch and reconcile remote work before committing or pushing; preserve unrelated work and never force-push. This task's `origin` is omarchy; `github` explicitly targets the public repository. A Git push and an active verified deployment remain separate evidence layers. Follow [publishing operations](docs/PUBLISHING_SERVICE.md) for initial bootstrap, activation and emergency rollback. No account/DNS move or paid upgrade is implied.

After deployment, inspect `npx wrangler deployments list`, live `/release.json`, `npm run verify:seo -- --url https://marriedbyjake.com`, representative routes, actual image bytes, signed previews and CMS sign-in. Check affected desktop/mobile UI and record the source SHA, content hash and active Worker traffic separately. Keep dated evidence in [project history](docs/PROJECT_HISTORY.md).

### IndexNow

The only accepted query URLs are canonical testimonial directory pages (`/weddingtestimonials?page=N`, integer N ≥ 2). Page-one aliases, padded page numbers, filters, fragments, other query URLs, foreign domains and CMS routes remain excluded.

The root verification file in `public/` and `src/data/indexnow.json` configure IndexNow for the canonical domain. `scripts/submit-indexnow.mjs` verifies the deployed key, reads the live published sitemap, validates canonical URLs and submits batches of at most 10,000 to the shared IndexNow endpoint. If that endpoint reports `SiteVerificationNotCompleted`, the script submits through the official Yandex participant, which shares submissions through IndexNow; other errors still fail. The npm `postdeploy` hook runs this after every successful `npm run deploy`; local builds do not submit unpublished changes. Direct `wrangler deploy` bypasses the hook, so run `npm run indexnow` afterwards.

Use `npm run indexnow -- --dry-run` to verify the live key and sitemap without submitting. A submission error leaves the successful Worker deployment in place; retry with `npm run indexnow`. HTTP 200 means received, and HTTP 202 means received with key validation pending; neither guarantees indexing. Content releases now deploy through Builds and invoke IndexNow after successful deployment. Protocol: [IndexNow documentation](https://www.indexnow.org/documentation).

### Production resources and recovery

Configured resources are D1 `marriedbyjake-emdash` (`DB`), private R2 `marriedbyjake-emdash-media` (`MEDIA`), KV sessions (`SESSION`) and Cloudflare Images (`IMAGES`). The scheduled EmDash handler runs every minute. Full-site Worker routes handle `marriedbyjake.com/*` and `www.marriedbyjake.com/*`; preserve the established routing unless a routing change is requested.

The hostname `https://marriedbyjake.withersco.workers.dev` runs the same Worker with the same production bindings. It is not an isolated staging database.

Required production secrets are `EMDASH_ENCRYPTION_KEY` and `EMDASH_SETUP_PASSWORD`. Store values through [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/), never in source, command arguments or logs. Preserve the existing encryption key; replacing it can invalidate encrypted settings. Ignored `.env`, `.dev.vars`, `.emdash/` and Wrangler credential files must remain private.

A Worker rollback restores application code, not CMS data or media. Before a database/media migration or destructive operation, back up current D1 and R2 independently. Follow [CMS operations](docs/CMS.md) for recovery; never substitute the archived Markdown snapshot for a production backup.

## Documentation map

- [AGENTS.md](AGENTS.md): required workflow and constraints for coding agents.
- [CMS operations](docs/CMS.md): accounts, resources, editing, migration and recovery.
- [Publishing operations](docs/PUBLISHING_SERVICE.md): Git releases, status, Cloudflare Builds, activation and rollback.
- [Homepage video](docs/VIDEO.md): Stream uploads, posters and playback verification.
- [Vendor research](docs/VENDOR_LINKS.md): verified vendors and historical URL decisions.
- [Testimonial inline links](docs/TESTIMONIAL_INLINE_LINKS.md): reviewed phrase selections and rationale.
- [Project history](docs/PROJECT_HISTORY.md): dated changes and validation/release evidence.

Design and implementation by [Josh Withers](https://joshwithers.au) and [The Internet](https://theinternet.com.au).
