# Married by Jake

Jake’s Astro website and EmDash CMS run together on Cloudflare Workers. Published content is read from D1 on each request; uploads live in a private R2 bucket. Jake and Josh have administrator access.

- Website: https://marriedbyjake.com
- Editor: https://marriedbyjake.com/_emdash/admin
- Development: `npm ci`, copy `.dev.vars.example` to `.dev.vars`, then `npm run dev`
- Validate: `npm run validate`
- Deploy: `npm ci`, authenticate with `npx wrangler login --device --browser=false`, then run `npm run deploy`
- Operations and content editing: [CMS runbook](docs/CMS.md)
- Changes and migration evidence: [project history](docs/PROJECT_HISTORY.md)

Use Node 24 LTS (24.15 or newer). Astro 7, Tailwind CSS 4 and React power the public site and EmDash editor. `npm run types` generates Worker binding types after changes to `wrangler.jsonc`.

The Markdown files in `src/content/` are the original migration source and an archive. Editing them does not change the live website. Use EmDash for posts, testimonials, services, readings, info pages and prices. Public layout, navigation, static landing-page copy and videos remain in Astro source files.

All public internal links and canonical URLs omit trailing slashes, except `/`. Historic URLs are handled by Worker middleware using `src/data/redirects.json`.

Testimonials are formatted from live CMS content by the public renderer: review words are preserved, paragraph breaks are tidied, and wedding credits are shown separately. Confirmed dead or unrelated vendor links are displayed as plain text; supplied social handles remain usable when an official website cannot be matched. Vendor website lookups and research evidence live in `src/data/testimonial-vendors.json` and [vendor notes](docs/VENDOR_LINKS.md). `npm run test:content` checks formatting and canonical link behavior.

Production deploys only to Cloudflare Workers. `npm run deploy` validates and builds before publishing. Verify the deployment in Wrangler, then run `npm run verify:seo -- --url https://marriedbyjake.com`. Git changes are committed and pushed to `main` separately from deploying. See [CMS operations](docs/CMS.md) for the complete procedure.

`PUBLIC_GOOGLE_MAPS_API_KEY` is a build-time environment variable used by the browser maps. Its existing value remains in the ignored `.env`; keep its Google API restrictions configured for the canonical domain. Testimonial map coordinates are now editable CMS fields. The original geocoding cache is retained for migration reference; builds no longer invoke the geocoder.

Design and implementation by [Josh Withers](https://joshwithers.au) and [The Internet](https://theinternet.com.au).
