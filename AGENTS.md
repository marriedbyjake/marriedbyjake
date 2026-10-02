# Repository instructions

## Production deployment

Cloudflare Workers is the only production deployment target. Use Node 24 LTS.

1. Install dependencies with `npm ci`.
2. Authenticate with `npx wrangler login --device --browser=false`. Complete approval in the browser within five minutes.
3. Run `npm run deploy`. This validates and builds the site before deploying it.
4. Check the active deployment with `npx wrangler deployments list`.
5. Verify the live site with `npm run verify:seo -- --url https://marriedbyjake.com`.

Commit and push source changes to `main` separately from deployment. A Git push does not deploy the Worker. Do not configure another hosting provider as a production target.

## Content and secrets

EmDash serves live content from D1 and stores uploaded media in a private R2 bucket. Markdown under `src/content/` is an archive and migration source; editing it does not publish content. Do not reimport the archived source over production.

Testimonial formatting belongs in the live CMS renderer (`src/lib/testimonial-format.ts` and `TestimonialContent.astro`), not only in archived Markdown. Preserve the review wording. Keep vendor names when a website cannot be verified; do not guess domains. Run `npm run test:content` after formatting or link-normalization changes. Vendor research and unavailable historical URLs are documented in `docs/VENDOR_LINKS.md`.

Keep credentials, access links, secret values and private rollback data out of Git and logs. Use Wrangler secrets for production credentials. See [CMS operations](docs/CMS.md) for account, recovery and migration procedures.

## Routes and links

Preserve the redirect rules in `src/data/redirects.json`, using the shape `{ "redirects": [...] }`. Public internal links omit a trailing slash, except the homepage `/`. Keep existing redirects when changing route handling.

## Visual styling

Use square corners for public cards, panels, image containers and buttons to match the site design. Preserve circular shapes used for icons and pagination indicators.
