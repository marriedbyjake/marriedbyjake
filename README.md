# Married by Jake

Jake’s public website and EmDash editor run together on Cloudflare Workers. Astro renders pages from published CMS content in D1; uploaded media is stored in a private R2 bucket. Source changes are released from `main`. Publishing CMS content and deploying website code are separate operations.

- [Website](https://marriedbyjake.com)
- [EmDash editor](https://marriedbyjake.com/_emdash/admin)
- [Agent instructions](AGENTS.md)
- [CMS operations, access and recovery](docs/CMS.md)

Use Node 24 LTS, version 24.15 or newer. The project uses Astro, Tailwind CSS, React and EmDash; `package.json` and `package-lock.json` record the supported dependencies.

## Choose where to make the change

| Change | Source of truth | How it reaches the website |
| --- | --- | --- |
| Blog posts, testimonials, services, readings, info pages and pricing | EmDash editor / production D1 | Save a draft, review it, then Publish; no code deployment is needed |
| Page structure, navigation, static landing-page copy and components | `src/pages/`, `src/layouts/`, `src/components/` | Validate, commit and push to `main`, then deploy the Worker |
| Public styling | `src/styles/` and component styles | Deploy the Worker; preserve the existing design and square corners |
| Titles and descriptions | Page/layout props, `src/components/fundations/head/Seo.astro`, `src/data/seo.json` | Check route-specific overrides as well as CMS fields, then deploy source changes |
| Testimonial quote formatting and wedding-team presentation | `src/lib/testimonial-format.ts`, `src/components/testimonials/TestimonialContent.astro` | Run `npm run test:content`, then deploy the renderer |
| Natural links inside testimonial quotes | `src/lib/testimonial-inline-links.ts`, `src/data/testimonial-inline-links.json` | Preserve existing review words; test and deploy |
| Verified vendor websites and unavailable links | `src/data/testimonial-vendors.json`, `src/data/unavailable-vendor-urls.json` | Record research in `docs/VENDOR_LINKS.md`, test and deploy |
| Redirects and canonical internal links | `src/data/redirects.json`, `src/middleware.ts`, `src/lib/internal-links.ts` | Preserve existing redirect rules, test and deploy |
| Homepage background videos and matching posters | `src/data/hero-video.ts` and poster assets | Follow [the video runbook](docs/VIDEO.md), then deploy |
| Worker bindings, routes and runtime configuration | `wrangler.jsonc`, `src/worker.ts`, `astro.config.mjs` | Regenerate types, validate and deploy |

Markdown under `src/content/` is the original migration source and an archive. Editing it does not publish content. The old `.pages.yml` is migration reference only. Never reimport archived content over production to apply an ordinary edit.

## How EmDash works here

`astro.config.mjs` enables server rendering and connects EmDash to the `DB` and `MEDIA` bindings. `src/live.config.ts` registers the runtime loader. Public templates use `getCollection()` and `getEntry()` from `src/lib/cms.ts`; that adapter normalizes CMS field names, media references and internal links for the site’s existing templates. Rich content is Portable Text, rendered with EmDash’s `PortableText` component or the testimonial renderer.

| CMS collection slug | Content | Public route |
| --- | --- | --- |
| `posts` | Blog posts | `/blog/<slug>` |
| `weddingtestimonials` | Couple reviews, venue, rating, images and map coordinates | `/weddingtestimonials/<slug>` |
| `services` | Service descriptions | `/<slug>` and `/services` |
| `readings` | Readings, poems and blessings | `/wedding-readings` |
| `infopages` | Information pages | `/<slug>` |
| `pricing` | Australian ceremonies, international ceremonies and MC pricing | `/serviceandprice` |

To edit content, sign in at the editor with your own passkey, choose the collection and entry, save a draft, review it, then Publish. A saved draft revision leaves the published version intact. Publishing updates the public page and relevant search, RSS and sitemap output without rebuilding. Signed previews are for authorized viewers; ordinary public requests must not expose drafts. Archiving an entry removes it from public output. Avoid slugs reserved by static pages, such as `/contact` and `/faq`.

Use the CMS Media picker for uploaded images and supply appropriate alt text. Testimonial overview-map positions come from the CMS latitude and longitude fields. The detail map also uses venue and location text. Local source images and public assets remain separate from CMS uploads.

Josh and Jake use separate administrator accounts. Passkeys and private copied invitation/recovery links are the documented access method; email delivery is not configured in the runbook. Follow [CMS operations](docs/CMS.md) for account recovery. `npm run cms:access` creates production access credentials in an ignored private file; it is an operator recovery action, not a development or deployment prerequisite.

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

`PUBLIC_GOOGLE_MAPS_API_KEY` is a build-time value used by browser maps. Keep the existing value in the ignored `.env`, with Google API restrictions for the canonical domain. Builds no longer invoke the old geocoder; its cache is retained as migration reference.

| Command | Purpose |
| --- | --- |
| `npm run test:content` | Check testimonial wording preservation, formatting and canonical links |
| `npm run types` | Regenerate Worker binding types after configuration changes |
| `npm run check` | Regenerate types and run Astro diagnostics |
| `npm run validate` | Run content tests, Astro diagnostics and the production build |
| `npm run cms:validate` | Validate the schema-only `seed/seed.json`; does not validate production content |
| `npm run verify:seo -- --url http://localhost:4321` | Check rendered pages on a running local server; use its actual URL/port |

`npm run cms:prepare` recreates `.emdash/import.db` from the archive and writes migration files. It is not part of routine development or deployment and is not a current production backup. Never use that snapshot to overwrite live CMS content, users or credentials.

## Deploy to Cloudflare Workers

Cloudflare Workers is the only production target. The Worker is `marriedbyjake`, in the Withers Co account configured in `wrangler.jsonc`. Git pushes do not deploy it.

For a source release, inspect the working tree, fetch and integrate current remote work, and commit/push the intended source changes to `main`. Preserve unrelated changes and avoid force pushes. Confirm that the checkout contains the exact revision you intend to deploy. Then follow this procedure:

1. Use Node 24 LTS and install the locked dependencies:

   ```sh
   npm ci
   ```

2. Authenticate using the [Wrangler device login flow](https://developers.cloudflare.com/workers/wrangler/commands/general/#use-wrangler-login-without-a-local-callback-server):

   ```sh
   npx wrangler login --device --browser=false
   ```

   Keep the command running, open its verification URL in a browser and approve within five minutes. If the code expires, restart the command. Confirm access to the configured Withers Co account with `npx wrangler whoami`. Keep login codes and credential files private.

3. Validate, build and deploy from that checkout:

   ```sh
   npm run deploy
   ```

   This runs `npm run validate` before `wrangler deploy`. To annotate the release, use `npm run deploy -- --message "main COMMIT: change description"`, replacing `COMMIT` with the actual Git revision. Do not deploy a stale `dist/` from a different source revision.

4. Inspect the active deployment:

   ```sh
   npx wrangler deployments list
   ```

   Confirm the intended version and traffic allocation. Upload success alone is not proof that the version is active.

5. Check the rendered canonical website:

   ```sh
   npm run verify:seo -- --url https://marriedbyjake.com
   ```

   The checker reads the live sitemap, fetches published pages and checks internal-link responses, metadata, testimonial markup and natural inline links. An SSR build does not emit static HTML for these CMS pages, so this check needs a running site.

For material changes, also smoke-test `/`, a blog post, a testimonial with an image, `/serviceandprice`, `/wedding-readings`, `/search.json`, `/rss.xml`, `/sitemap-0.xml` and `/_emdash/admin`. Check `www` and historical redirects, actual image responses, and desktop/mobile browser behavior for affected UI. Report the Git revision, Worker version, active traffic and completed checks, along with any verification gap. Append release evidence to [project history](docs/PROJECT_HISTORY.md); old counts and version IDs there are dated evidence.

### Production resources and recovery

Configured resources are D1 `marriedbyjake-emdash` (`DB`), private R2 `marriedbyjake-emdash-media` (`MEDIA`), KV sessions (`SESSION`) and Cloudflare Images (`IMAGES`). The scheduled EmDash handler runs every minute. Full-site Worker routes handle `marriedbyjake.com/*` and `www.marriedbyjake.com/*`; preserve the established routing unless a routing change is requested.

The hostname `https://marriedbyjake.withersco.workers.dev` runs the same Worker with the same production bindings. It is not an isolated staging database.

Required production secrets are `EMDASH_ENCRYPTION_KEY` and `EMDASH_SETUP_PASSWORD`. Store values through [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/), never in source, command arguments or logs. Preserve the existing encryption key; replacing it can invalidate encrypted settings. Ignored `.env`, `.dev.vars`, `.emdash/` and Wrangler credential files must remain private.

A Worker rollback restores application code, not CMS data or media. Before a database/media migration or destructive operation, back up current D1 and R2 independently. Follow [CMS operations](docs/CMS.md) for recovery; never substitute the archived Markdown snapshot for a production backup.

## Documentation map

- [AGENTS.md](AGENTS.md): required workflow and constraints for coding agents.
- [CMS operations](docs/CMS.md): accounts, resources, editing, migration and recovery.
- [Homepage video](docs/VIDEO.md): Stream uploads, posters and playback verification.
- [Vendor research](docs/VENDOR_LINKS.md): verified vendors and historical URL decisions.
- [Testimonial inline links](docs/TESTIMONIAL_INLINE_LINKS.md): reviewed phrase selections and rationale.
- [Project history](docs/PROJECT_HISTORY.md): dated changes and validation/release evidence.

Design and implementation by [Josh Withers](https://joshwithers.au) and [The Internet](https://theinternet.com.au).
