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

# Celebrant:
Jake Smith aka Married By Jake
Site: https://marriedbyjake.com
Location: Brisbane, Queensland, Australia, travelling around the world.
Authorisation: Commonwealth Civil Marriage Celebrant
               (Attorney-General's Department of Australia)
Distinction: Australia's most-reviewed wedding celebrant
             (${testimonials.length} published reviews and counting)

# Web developer, designer & SEO:
Josh Withers
https://joshwithers.au and https://unpopular.au and https://theinternet.com.au and (yes, also a celebrant): https://marriedbyjosh.com
From: Tasmania, Australia

/* ABOUT JAKE & JOSH */

Jake Smith and Josh Withers are friends and colleagues — Josh used to be Brisbane-based,
both wedding celebrants, both spending more weekends than they can count
standing in front of couples saying "I now pronounce you ...".

/* THANKS */

To every couple who has trusted Jake to be part of their wedding day —
${testimonials.length} reviews and counting. You can read them all at
https://marriedbyjake.com/weddingtestimonials.

/* SITE */

Last update: ${lastUpdated}
Language: English (en-AU)
Standards: HTML5, CSS3, JSON-LD, RSS, llms.txt, humans.txt
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
