import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const [posts, testimonials, services] = await Promise.all([
    getCollection("posts"),
    getCollection("weddingtestimonials"),
    getCollection("services"),
  ]);

  const lastUpdated = new Date().toISOString().slice(0, 10);

  const body = `/* TEAM */

Celebrant: Jake Smith
Site: https://marriedbyjake.com
Location: Brisbane, Queensland, Australia
Authorisation: Commonwealth Civil Marriage Celebrant (Attorney-General's Department)

Design & Build: Josh Withers
Site: https://joshwithers.au
From: Brisbane, Australia

/* THANKS */

To every couple who has trusted Jake to be part of their wedding day —
${testimonials.length} reviews and counting. You can read them all at
https://marriedbyjake.com/weddingtestimonials.

/* SITE */

Last update: ${lastUpdated}
Language: English (en-AU)
Standards: HTML5, CSS3, JSON-LD, RSS
Components: Astro 6, Tailwind CSS v4
Software: Astro, Vercel
Counts: ${services.length} services, ${posts.length} blog posts, ${testimonials.length} testimonials
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
