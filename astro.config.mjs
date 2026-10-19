import {publicRoutingVite} from './scripts/lib/public-routing-data.mjs';
import { buildSource } from './scripts/lib/build-source.mjs';
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";

const {commit:sourceCommit} = buildSource();

export default defineConfig({
  output: "static",
  build: { format: "file" },
  adapter: cloudflare({ imageService: "compile" }),
  // EmDash media values carry absolute canonical URLs. Permit only this file
  // route so Astro generates real variants instead of returning the original.
  image: {
    remotePatterns: [{ protocol: "https", hostname: "marriedbyjake.com", pathname: "/_emdash/api/media/file/**" }],
  },
  vite: {
    plugins: [publicRoutingVite(),tailwindcss()],
    define: { "import.meta.env.EMDASH_PREVIEW_PATH_PATTERN": JSON.stringify("/_preview/{collection}/{id}"),
      "import.meta.env.PUBLISHED_SOURCE_COMMIT": JSON.stringify(sourceCommit) },
  },
  integrations: [
    {
      name: "published-content-routes",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          // Files/directories beginning with underscore are excluded by Astro's
          // filesystem router. Register these intentionally private paths here.
          injectRoute({ pattern: "/__published/testimonial-pages/[page]", entrypoint: "./src/routes/TestimonialPagination.astro", prerender: true });
          injectRoute({ pattern: "/_preview/[collection]/[id]", entrypoint: "./src/routes/ContentPreview.astro", prerender: false });
          injectRoute({ pattern: "/_publishing", entrypoint: "./src/routes/Publishing.astro", prerender: false });
          injectRoute({ pattern: "/_publishing/status", entrypoint: "./src/routes/PublishingStatus.ts", prerender: false });
          injectRoute({ pattern: "/_publishing/retry", entrypoint: "./src/routes/PublishingRetry.ts", prerender: false });
          injectRoute({ pattern: "/_private-image", entrypoint: "./src/routes/PrivateImage.ts", prerender: false });
        },
      },
    },
    react(),
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
    }),
  ],
  markdown: { shikiConfig: { theme: "css-variables", wrap: true } },
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
