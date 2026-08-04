# Married by Jake — Astro Site

- Design and implementation by [Josh Withers](https://joshwithers.au) — ([The Internet](https://theinternet.com.au))
- Built with Astro 7 and Tailwind CSS v4
- Hosted on Vercel

## Getting Started

- `npm install` — install dependencies
- `npm run dev` — start local dev server at `http://localhost:4321`
- `npm run build` — geocode locations, then build to `./dist`
- `npm run check` — run Astro and TypeScript diagnostics
- `npm run validate` — run diagnostics, geocoding, and a production build
- `npm run preview` — preview the production build
- `npm run build:locations` — re-run only the locations geocoder

## Deployment (Vercel)

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22.12.0 or newer (use an active LTS release in production)
- Redirects are managed in `vercel.json`

### Environment variables

Set these in the Vercel project settings (and mirror them in a local `.env` for development):

- `PUBLIC_GOOGLE_MAPS_API_KEY` — required. Used by both the build-time geocoder and the browser-side maps. The same key powers:
  - The geocoder script (`scripts/build-locations.mjs`) → Google Geocoding API
  - The wedding-locations interactive map (`src/components/testimonials/LocationsMap.astro`) → Google Maps JavaScript API
  - The per-testimonial venue map iframe (`src/pages/weddingtestimonials/[...slug].astro`) → Google Maps Embed API

The key is exposed to the client (it must be — the Maps JavaScript and Embed APIs run in the browser), so lock it down in the Google Cloud Console with HTTP-referrer restrictions for `marriedbyjake.com` and your preview/dev origins, and only enable the three APIs above.

## Wedding Locations Map

The site includes an interactive map showing all wedding locations from the testimonials, plus a small per-testimonial venue map on each detail page.

### How it works

1. **Source data**: Testimonials in `src/content/weddingtestimonials/*.md` provide `venue` and `location` fields.
2. **Geocoding script**: `scripts/build-locations.mjs` scans these files, finds unique locations, and fetches coordinates from the Google Geocoding API. If `PUBLIC_GOOGLE_MAPS_API_KEY` is missing it falls back to OpenStreetMap Nominatim.
3. **Data storage**: Coordinates are cached in `src/data/locations.json`. The script only geocodes new entries and prunes ones that are no longer referenced.
4. **Locations map**: `src/components/testimonials/LocationsMap.astro` reads the JSON and renders an interactive Google Map with a marker per venue.
5. **Per-testimonial venue map**: `src/pages/weddingtestimonials/[...slug].astro` renders a small Maps Embed API iframe pinned to `venue + location`.

### Updating the map

The geocoder runs automatically as part of `npm run build`, so a fresh deploy will always pick up new locations. To refresh the cache locally without a full build:

```bash
npm run build:locations
```

This will:

- Scan all testimonial files
- Geocode any locations not already in `locations.json`
- Prune entries no longer referenced by any testimonial
- Write `src/data/locations.json`

## Content Collections

Content is managed with Astro Content Collections defined in `src/content.config.ts`. Add or edit Markdown files under `src/content/<collection>` using the frontmatter shown below.

### Blog Posts (`posts`)

- Path: `src/content/posts/`
- Frontmatter:
  - `title` (string)
  - `pubDate` (date)
  - `description` (string)
  - `image` (object): `{ url, alt }`
  - `tags` (string[]) optional
  - `youtubeUrl` (string, url) optional — when present, the featured image becomes the poster for a click-to-play YouTube embed
- Routes: `/blog/` index, `/blog/<slug>/` per post

### Services (`services`)

- Path: `src/content/services/`
- Frontmatter:
  - `title` (string)
  - `summary` (string) optional
  - `description` (string) optional
  - `order` (number) optional — lower numbers appear first on the Services index
  - `image` (object) optional: `{ url, alt }`
  - `icon` (string) optional
- Routes:
  - Index: `/services` — lists services sorted by `order`, then `title`
  - Detail: `/<slug>/` — each service renders at the site root (e.g. `/wedding-celebrant/`)

### Wedding Testimonials (`weddingtestimonials`)

- Path: `src/content/weddingtestimonials/`
- Frontmatter:
  - `coupleName` (string)
  - `location` (string) optional — auto title-cased
  - `venue` (string) optional — auto title-cased
  - `image` (object) optional: `{ url, alt }`
  - `featured` (boolean) optional, defaults to `false`
  - `rating` (number) — 1 to 5
  - `pubDate` (date) optional — used for sorting
- Routes:
  - Index: `/weddingtestimonials/`
  - Detail: `/weddingtestimonials/<slug>/`

How to update:

- Add a `.md` file under `src/content/weddingtestimonials/` with the above frontmatter
- Body content renders as the testimonial
- A small Google Maps Embed iframe appears beneath the venue line when `venue` or `location` is provided
- Hero images render at their natural aspect ratio (no cropping) — Astro reads the imported asset's intrinsic width/height

### Wedding Readings (`readings`)

- Path: `src/content/readings/`
- Frontmatter:
  - `title` (string)
  - `author` (string) optional — shown beneath the title in italics
  - `order` (number) optional — lower numbers appear first
- Body: standard Markdown. Each blank-line-separated block becomes its own paragraph; a dropcap is applied to the first paragraph automatically.
- Route: `/wedding-readings` renders every reading sorted by `order`.

How to add a new reading:

1. Create a new `.md` file in `src/content/readings/` (slug becomes the file name).
2. Set `title`, optionally `author`, and an `order` number to position it in the list.
3. Write the reading body in Markdown.

### Info Pages (`infopages`)

- Path: `src/content/infopages/`
- Frontmatter:
  - `page` (string)
  - `pubDate` (date)
- Routes: pages consume content contextually, e.g. `/infopages/privacy/`, `/infopages/terms/`

### Pricing (`pricing`)

- Path: `src/content/pricing/`
- Frontmatter (single document with three nested objects, each containing `title`, `price`, and `description`):
  - `australianCeremonies`
  - `internationalCeremonies`
  - `mc`
- Used by the services and pricing pages to render up-to-date prices in one place.

## Navigation & Footer

- Main navigation links are defined in `src/components/global/navLinks.ts`. Update this module to change top-level links and shortcuts.
- Footer shows Quick Links, Social Media, and "Found On" external features. Add more entries by editing `src/components/global/Footer.astro` (arrays near the top).

## Media & Assets

- Place static assets in `public/` for direct serving (e.g. `/og-image.jpg`, favicons, captions `hello-jake.vtt`).
- Place authored images in `src/images/` when using Astro `Image` or collection `image.url` frontmatter.
- Fonts (Inter and Newsreader) are configured in `astro.config.mjs` via `fontProviders.google()` and surfaced through `src/components/fundations/head/Fonts.astro`.
- Favicons: `favicon.svg` default with `favicon.png` fallback configured in `src/components/fundations/head/Favicons.astro`.

## SEO

- Site-wide OG default: `public/og-image.jpg`
- SEO component: `src/components/fundations/head/Seo.astro` via `BaseHead`
- Sitemap is generated by `@astrojs/sitemap` with custom `lastmod` derived from each collection's most recent `pubDate` (see `astro.config.mjs`).
- Per-page SEO:
  - Use `BaseLayout` props: `title`, `description`, `canonical`, `image`, `ogType`
  - Blog posts automatically pass `title`, truncated `description`, and featured image
  - FAQ page outputs valid `FAQPage` JSON-LD from the on-page questions
  - Testimonial detail pages output `Review` JSON-LD

## Video

- Video component: `src/components/fundations/elements/Video.astro`
- Supports lazy loading, overlay play button, and caption tracks via a child `<track>` (e.g. `/hello-jake.vtt`).

## Performance

- Tailwind CSS v4 via `@tailwindcss/vite`

## Support

- Design & build: [Josh Withers](https://marriedbyjosh.com), [Unpopular](https://unpopular.au) and [The Internet](https://theinternet.com.au) — josh@withers.co
- General Astro docs: https://docs.astro.build
