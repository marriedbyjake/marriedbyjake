import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://marriedbyjake.com";

const escape = (s: string | undefined | null) =>
  (s ?? "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

export const GET: APIRoute = async () => {
  const [posts, testimonials, services, readings, infopages] = await Promise.all([
    getCollection("posts"),
    getCollection("weddingtestimonials"),
    getCollection("services"),
    getCollection("readings"),
    getCollection("infopages"),
  ]);

  // Sort services by order, then title
  const sortedServices = [...services].sort((a, b) => {
    const ao = a.data.order ?? 999;
    const bo = b.data.order ?? 999;
    if (ao !== bo) return ao - bo;
    return a.data.title.localeCompare(b.data.title);
  });

  // Sort posts newest-first
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime(),
  );

  // Sort testimonials newest-first (undated entries fall to the end)
  const sortedTestimonials = [...testimonials].sort((a, b) => {
    const ad = a.data.pubDate ? new Date(a.data.pubDate).getTime() : 0;
    const bd = b.data.pubDate ? new Date(b.data.pubDate).getTime() : 0;
    return bd - ad;
  });

  // Sort readings by order
  const sortedReadings = [...readings].sort(
    (a, b) => (a.data.order ?? 999) - (b.data.order ?? 999),
  );

  const lines: string[] = [];

  lines.push("# Married by Jake");
  lines.push("");
  lines.push(
    "> Jake Smith is an authorised Commonwealth Civil Marriage Celebrant based in Brisbane, Australia. He creates warm, calm, personal and legally valid wedding ceremonies for couples of every background, across South East Queensland and beyond.",
  );
  lines.push("");
  lines.push(
    "Married by Jake is an Australian wedding celebrant business. Jake conducts civil and Christian wedding ceremonies, elopements, vow renewals, and acts as Master of Ceremonies. He has been featured in over " +
      testimonials.length +
      " published wedding reviews and travels regularly across Australia and internationally for ceremonies.",
  );
  lines.push("");

  // Core pages
  lines.push("## Key pages");
  lines.push("");
  lines.push(`- [Home](${SITE}/): Overview of Jake Smith's wedding celebrant services across Brisbane and Australia.`);
  lines.push(`- [About Jake](${SITE}/about-jake): Background, story and credentials of celebrant Jake Smith.`);
  lines.push(`- [Contact](${SITE}/contact): Enquire about availability and book Jake for your wedding.`);
  lines.push(`- [Frequently Asked Questions](${SITE}/faq): Legal requirements, NOIM, booking, fees, travel and more.`);
  lines.push(`- [Brisbane Weddings](${SITE}/brisbane): Information for couples getting married in Brisbane.`);
  lines.push(`- [Sydney Weddings](${SITE}/sydney): Information for couples getting married in Sydney.`);
  lines.push(`- [Byron Bay Weddings](${SITE}/byron-bay): Information for couples getting married in Byron Bay and the Northern Rivers.`);
  lines.push(`- [Gold Coast Weddings](${SITE}/gold-coast): Information for couples getting married on the Gold Coast.`);
  lines.push(`- [Sunshine Coast Weddings](${SITE}/sunshine-coast): Information for couples getting married on the Sunshine Coast.`);
  lines.push(`- [Services](${SITE}/services): Full list of ceremony and MC services Jake offers.`);
  lines.push(`- [Service & Pricing](${SITE}/serviceandprice): Current ceremony pricing and inclusions.`);
  lines.push(`- [Wedding Readings](${SITE}/wedding-readings): Curated collection of readings and poems for ceremonies.`);
  lines.push(`- [Wedding Testimonials](${SITE}/weddingtestimonials): Index of real wedding reviews from past couples.`);
  lines.push(`- [Blog](${SITE}/blog): Articles on wedding planning, ceremonies and Jake's work.`);
  lines.push("");

  // Services
  if (sortedServices.length > 0) {
    lines.push("## Services");
    lines.push("");
    for (const s of sortedServices) {
      const summary = escape(s.data.summary || s.data.description || "");
      lines.push(
        `- [${s.data.title}](${SITE}/${s.id})${summary ? ": " + truncate(summary, 200) : ""}`,
      );
    }
    lines.push("");
  }

  // Blog posts
  if (sortedPosts.length > 0) {
    lines.push("## Blog posts");
    lines.push("");
    for (const p of sortedPosts) {
      const date = p.data.pubDate
        ? new Date(p.data.pubDate).toISOString().slice(0, 10)
        : "";
      const desc = escape(p.data.description);
      lines.push(
        `- [${p.data.title}](${SITE}/blog/${p.id})${date ? " (" + date + ")" : ""}${desc ? ": " + truncate(desc, 200) : ""}`,
      );
    }
    lines.push("");
  }

  // Wedding readings
  if (sortedReadings.length > 0) {
    lines.push("## Wedding readings");
    lines.push("");
    for (const r of sortedReadings) {
      const author = r.data.author ? ` — ${r.data.author}` : "";
      lines.push(`- [${r.data.title}${author}](${SITE}/wedding-readings#${r.id})`);
    }
    lines.push("");
  }

  // Info pages
  const infoForLlms = infopages.filter((p) =>
    ["privacy", "terms"].includes(p.id),
  );
  if (infoForLlms.length > 0) {
    lines.push("## Legal");
    lines.push("");
    for (const p of infoForLlms) {
      lines.push(`- [${p.data.page}](${SITE}/${p.id})`);
    }
    lines.push("");
  }

  // ALL testimonials
  lines.push(`## Wedding testimonials (${sortedTestimonials.length})`);
  lines.push("");
  lines.push(
    "Real reviews from couples Jake has married. Each entry includes the couple, venue, location and a star rating.",
  );
  lines.push("");
  for (const t of sortedTestimonials) {
    const venue = escape(t.data.venue || "");
    const location = escape(t.data.location || "");
    const place = [venue, location].filter(Boolean).join(", ");
    const date = t.data.pubDate
      ? new Date(t.data.pubDate).toISOString().slice(0, 10)
      : "";
    const stars = typeof t.data.rating === "number" ? `${t.data.rating}★` : "";
    const meta = [stars, place, date].filter(Boolean).join(" · ");
    lines.push(
      `- [${t.data.coupleName}](${SITE}/weddingtestimonials/${t.id})${meta ? ": " + meta : ""}`,
    );
  }
  lines.push("");

  // Optional metadata
  lines.push("## Optional");
  lines.push("");
  lines.push(`- [Full content dump (llms-full.txt)](${SITE}/llms-full.txt): Complete editorial content of every page, reading, blog post, and testimonial in one plain-text document.`);
  lines.push(`- [RSS feed](${SITE}/rss.xml)`);
  lines.push(`- [Sitemap](${SITE}/sitemap-index.xml)`);
  lines.push(`- [Search index (JSON)](${SITE}/search.json)`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
