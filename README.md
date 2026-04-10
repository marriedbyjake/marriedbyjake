# Married by Jake — Astro Site

- Design and implementation by Josh Withers - ([The Internet](https://theinternet.com.au))
- Email: josh@withers.co
- Built with Astro and Tailwind CSS
- Hosted on Cloudflare Pages

## Getting Started

- `npm install` — install dependencies
- `npm run dev` — start local dev server at `http://localhost:4321`
- `npm run build` — build to `./dist`
- `npm run preview` — preview the production build

## Deployment (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Node version: latest LTS recommended
- Set the project’s root to the repository root

## Wedding Locations Map

The site includes an interactive map showing all wedding locations from the testimonials. This uses the **Google Maps JavaScript API**.

### Configuration
To enable the map, you must provide a Google Maps API Key.
1. Create a `.env` file in the project root (if it doesn't exist).
2. Add your API key:
   ```env
   PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
3. Ensure the API Key has the "Maps JavaScript API" enabled in the Google Cloud Console.

### How it works:
1. **Source Data**: Testimonials in `src/content/weddingtestimonials/*.md` provide `venue` and `location` fields.
2. **Geocoding Script**: `scripts/geocode_locations.py` scans these files, finds unique locations, and fetches coordinates.
3. **Data Storage**: Coordinates are saved to `src/data/locations.json`.
4. **Component**: `src/components/testimonials/LocationsMap.astro` reads this JSON and renders the Google Map.

### Updating the Map
When adding new testimonials with new locations, update the map data by running:

```bash
# Install dependencies if needed (first time only)
pip install requests

# Run the geocoder
python3 scripts/geocode_locations.py
```

This will:
- Scan all testimonial files
- Identify new locations not yet in `locations.json`
- Fetch coordinates for them (with rate limiting to respect OSM policy)
- Update `src/data/locations.json`

The map component will automatically pick up these changes on the next build/dev server start.

## Content Collections

Content is managed with Astro Content Collections in `src/content/config.ts`. Add or edit Markdown files under `src/content/<collection>` using the frontmatter shown below.

### Blog Posts (`posts`)

- Path: `src/content/posts/`
- Frontmatter:
  - `title` (string)
  - `pubDate` (date)
  - `description` (string)
  - `image` (object): `{ url, alt }`
  - `tags` (string[]) optional
  - `youtubeUrl` (string, url) optional — when present, the featured image becomes the poster for a click‑to‑play YouTube embed
- Routes: `/blog/` index, `/blog/posts/<slug>/` per post

How to update:
- Add a new `.md` file to `src/content/posts/` with the above frontmatter
- Use local images by setting `image.url` to a project path (e.g. `/src/images/...`) and `alt` text
- Optional: include `youtubeUrl` to enable the optimized embed

### Services (`services`)

- Path: `src/content/services/`
- Frontmatter:
  - `title` (string)
  - `summary` (string) optional
  - `description` (string) optional
  - `order` (number) optional — lower numbers appear first on the Services index
  - `image` (object) optional: `{ url, alt }`
- Routes:
  - Index: `/services` — lists services sorted by `order`, then `title`
  - Detail: `/<slug>/` — each service renders at the site root (e.g. `/wedding-celebrant/`)

How to update:
- Add a `.md` file under `src/content/services/` and set `order` to control listing position
- Provide `image.url` and `image.alt` to show a hero and card image; if omitted, a safe placeholder renders

### Wedding Testimonials (`weddingtestimonials`)

- Path: `src/content/weddingtestimonials/`
- Frontmatter:
  - `coupleName` (string)
  - `location` (string) optional
  - `venue` (string) optional
  - `image` (object): `{ url, alt }`
  - `rating` (literal) — fixed at `5`
  - `pubDate` (date) optional — used for sorting
- Routes:
  - Index: `/weddingtestimonials/`
  - Detail: `/weddingtestimonials/<slug>/`

How to update:
- Add a `.md` file under `src/content/weddingtestimonials/` with the above frontmatter
- Body content renders as the testimonial; a small Google Maps embed appears beneath the venue line when `venue` or `location` is provided

### Info Pages (`infopages`)

- Path: `src/content/infopages/`
- Frontmatter:
  - `page` (string)
  - `pubDate` (date)
- Routes: pages consume content contextually, e.g. `/infopages/privacy/`, `/infopages/terms/`

## Navigation & Footer

- Main navigation links are defined in `src/components/global/navLinks.ts`. Update this module to change top‑level links and shortcuts.
- Footer shows Quick Links, Social Media, and “Found On” external features. Add more entries by editing `src/components/global/Footer.astro` (arrays near the top).

## Media & Assets

- Place static assets in `public/` for direct serving (e.g. `/og-image.jpg`, favicons, captions `hello-jake.vtt`).
- Place authored images in `src/images/` when using Astro `Image` or collection `image.url` frontmatter.
- Fonts are served locally from `public/fonts/` and preloaded in `src/components/fundations/head/Fonts.astro`.
- Favicons: `favicon.svg` default with `favicon.png` fallback configured in `src/components/fundations/head/Favicons.astro`.

## SEO

- Site‑wide OG default: `public/og-image.jpg`
- SEO component: `src/components/fundations/head/Seo.astro` via `BaseHead`
- Per‑page SEO:
  - Use `BaseLayout` props: `title`, `description`, `canonical`, `image`, `ogType`
  - Blog posts automatically pass `title`, truncated `description`, and featured image
  - FAQ page outputs valid `FAQPage` JSON‑LD from the on‑page questions

## Video

- Video component: `src/components/fundations/elements/Video.astro`
- Supports lazy loading, overlay play button, and caption tracks via a child `<track>` (e.g. `/hello-jake.vtt`).

## Performance

- Critical CSS inlining via `astro-critters`
- Asset compression and optimization via integrations configured in `astro.config.mjs`

## Support

- Design & build: Josh Withers, [Unpopular](https://unpopular.au) and [The Internet](https://theinternet.com.au) — josh@withers.co
- General Astro docs: https://docs.astro.build
