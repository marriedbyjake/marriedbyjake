import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  vite: { plugins: [tailwindcss()] },
  integrations: [
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
