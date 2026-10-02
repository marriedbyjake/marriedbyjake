# Married by Jake

Jake’s Astro website and EmDash CMS run together on Cloudflare Workers. Published content is read from D1 on each request; uploads live in a private R2 bucket. Jake and Josh have administrator access.

- Website: https://marriedbyjake.com
- Editor: https://marriedbyjake.com/_emdash/admin
- Development: `npm ci`, copy `.dev.vars.example` to `.dev.vars`, then `npm run dev`
- Validate: `npm run validate`
- Deploy: `npm run deploy` from an authenticated Cloudflare account
- Operations and content editing: [CMS runbook](docs/CMS.md)
- Changes and migration evidence: [project history](docs/PROJECT_HISTORY.md)

Use Node 24 LTS (24.15 or newer). Astro 7, Tailwind CSS 4 and React power the public site and EmDash editor. `npm run types` generates Worker binding types after changes to `wrangler.jsonc`.

The Markdown files in `src/content/` are the original migration source and an archive. Editing them does not change the live website. Use EmDash for posts, testimonials, services, readings, info pages and prices. Public layout, navigation, static landing-page copy and videos remain in Astro source files.

`PUBLIC_GOOGLE_MAPS_API_KEY` is a build-time environment variable used by the browser maps. Its existing value remains in the ignored `.env`; keep its Google API restrictions configured for the canonical domain. Testimonial map coordinates are now editable CMS fields. The original geocoding cache is retained for migration reference; builds no longer invoke the geocoder.

Design and implementation by [Josh Withers](https://joshwithers.au) and [The Internet](https://theinternet.com.au).
