import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";

function readFrontmatterDate(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    // Extract frontmatter block
    const m = raw.match(/^---\s*([\s\S]*?)\s*---/);
    if (!m) return null;
    const fm = m[1];
    const dm = fm.match(/pubDate:\s*(.+)/);
    if (!dm) return null;
    const val = dm[1].trim().replace(/^["']|["']$/g, '');
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// Precompute lastmod dates from content collections
const cwd = process.cwd();
const contentRoot = path.join(cwd, "src", "content");

function mapDatesFromDir(dir) {
  const map = {};
  const full = path.join(contentRoot, dir);
  if (!fs.existsSync(full)) return map;
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.md')) continue;
    const fp = path.join(full, f);
    const slug = f.replace(/\.md$/, '');
    const d = readFrontmatterDate(fp);
    if (d) map[slug] = d;
  }
  return map;
}

const postsDates = mapDatesFromDir("posts");
const testimonialsDates = mapDatesFromDir("weddingtestimonials");
const infoDates = mapDatesFromDir("infopages");

function latestDate(...dates) {
  return dates.filter(Boolean).reduce((max, d) => (d > max ? d : max), new Date(0));
}

const latestPosts = latestDate(...Object.values(postsDates));
const latestTestimonials = latestDate(...Object.values(testimonialsDates));
const latestInfo = latestDate(...Object.values(infoDates));
const siteUpdated = latestDate(latestPosts, latestTestimonials, latestInfo);

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap({
    // Keep XML minimal for SEO cleanliness
    namespaces: { news: false, video: false, xhtml: false },
    serialize(item) {
      try {
        const url = new URL(item.url);
        const pathname = url.pathname.replace(/\/$/, '');

        // Blog post detail
        const blogMatch = pathname.match(/^\/blog\/(.+)$/);
        if (blogMatch) {
          const slug = blogMatch[1];
          const d = postsDates[slug];
          item.lastmod = (d ?? latestPosts ?? siteUpdated).toISOString();
          return item;
        }

        // Blog index
        if (pathname === '/blog') {
          if (latestPosts.getTime() > 0) item.lastmod = latestPosts.toISOString();
          return item;
        }

        // Testimonial detail
        const testMatch = pathname.match(/^\/weddingtestimonials\/(.+)$/);
        if (testMatch) {
          const slug = testMatch[1];
          const d = testimonialsDates[slug];
          item.lastmod = (d ?? latestTestimonials ?? siteUpdated).toISOString();
          return item;
        }

        // Testimonials index
        if (pathname === '/weddingtestimonials') {
          if (latestTestimonials.getTime() > 0) item.lastmod = latestTestimonials.toISOString();
          return item;
        }

        // Info pages (terms, privacy etc.)
        const infoMatch = pathname.match(/^\/(privacy|terms)$/);
        if (infoMatch) {
          const slug = infoMatch[1];
          const d = infoDates[slug];
          item.lastmod = (d ?? siteUpdated).toISOString();
          return item;
        }

        // Fallback: set site-wide latest update
        if (siteUpdated.getTime() > 0) {
          item.lastmod = siteUpdated.toISOString();
        }
        return item;
      } catch {
        return item;
      }
    }
  })],
  markdown: {
    drafts: true,
    shikiConfig: {
      theme: "css-variables",
    },
  },
  shikiConfig: {
    wrap: true,
    skipInline: false,
    drafts: true,
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: [400, 500, 600, 700],
      styles: ["normal", "italic"],
    },
    {
      provider: fontProviders.google(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      weights: [400, 500, 600, 700],
      styles: ["normal", "italic"],
    },
  ],
  trailingSlash: "never",
  site: "https://marriedbyjake.com",
});
