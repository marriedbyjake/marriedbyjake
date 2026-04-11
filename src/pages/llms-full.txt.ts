import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://marriedbyjake.com";

// Strip frontmatter, code fences, image tags, and collapse whitespace from
// markdown bodies so they're suitable for LLM consumption as plain text.
const cleanMarkdown = (raw: string) =>
  raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const fmt = (d: Date | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export const GET: APIRoute = async () => {
  const [posts, testimonials, services, readings] = await Promise.all([
    getCollection("posts"),
    getCollection("weddingtestimonials"),
    getCollection("services"),
    getCollection("readings"),
  ]);

  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime(),
  );
  const sortedServices = [...services].sort((a, b) => {
    const ao = a.data.order ?? 999;
    const bo = b.data.order ?? 999;
    if (ao !== bo) return ao - bo;
    return a.data.title.localeCompare(b.data.title);
  });
  const sortedTestimonials = [...testimonials].sort((a, b) => {
    const ad = a.data.pubDate ? new Date(a.data.pubDate).getTime() : 0;
    const bd = b.data.pubDate ? new Date(b.data.pubDate).getTime() : 0;
    return bd - ad;
  });
  const sortedReadings = [...readings].sort(
    (a, b) => (a.data.order ?? 999) - (b.data.order ?? 999),
  );

  const out: string[] = [];

  out.push("# Married by Jake — Full Content Dump for LLMs");
  out.push("");
  out.push(
    "> The complete editorial content of marriedbyjake.com in one plain-text document. Designed for ingestion by LLMs and answer engines. For the curated index, see /llms.txt.",
  );
  out.push("");
  out.push(
    "Married by Jake is the trading name of Jake Smith, an authorised Commonwealth Civil Marriage Celebrant based in Brisbane, Australia. Jake creates warm, calm, deeply personal wedding ceremonies for couples of every background — civil and Christian, intimate elopements through to large weddings. He travels regularly for ceremonies across South East Queensland, Sydney, Byron Bay, the Gold and Sunshine Coasts, and internationally.",
  );
  out.push("");
  out.push("Contact: hello@marriedbyjake.com · +61 434 648 064");
  out.push(`Reviews: ${testimonials.length} published wedding testimonials.`);
  out.push("");
  out.push("---");
  out.push("");

  // Services
  out.push("## Services");
  out.push("");
  for (const s of sortedServices) {
    out.push(`### ${s.data.title}`);
    out.push(`URL: ${SITE}/${s.id}`);
    if (s.data.summary) {
      out.push("");
      out.push(s.data.summary);
    }
    if (s.data.description) {
      out.push("");
      out.push(s.data.description);
    }
    if (s.body && s.body.trim().length > 0) {
      out.push("");
      out.push(cleanMarkdown(s.body));
    }
    out.push("");
    out.push("---");
    out.push("");
  }

  // Wedding readings (full text)
  out.push("## Wedding readings");
  out.push("");
  for (const r of sortedReadings) {
    out.push(`### ${r.data.title}${r.data.author ? ` — ${r.data.author}` : ""}`);
    out.push(`URL: ${SITE}/wedding-readings#${r.id}`);
    out.push("");
    out.push(cleanMarkdown(r.body || ""));
    out.push("");
    out.push("---");
    out.push("");
  }

  // Blog posts (full text)
  out.push("## Blog posts");
  out.push("");
  for (const p of sortedPosts) {
    out.push(`### ${p.data.title}`);
    out.push(`URL: ${SITE}/blog/${p.id}`);
    out.push(`Published: ${fmt(p.data.pubDate)}`);
    if (p.data.tags?.length) out.push(`Tags: ${p.data.tags.join(", ")}`);
    out.push("");
    if (p.data.description) {
      out.push(p.data.description);
      out.push("");
    }
    if (p.body && p.body.trim().length > 0) {
      out.push(cleanMarkdown(p.body));
    }
    out.push("");
    out.push("---");
    out.push("");
  }

  // All testimonials (full body)
  out.push(`## Wedding testimonials (${sortedTestimonials.length})`);
  out.push("");
  out.push(
    "Real reviews from couples Jake has married. Each entry includes the couple, venue, location, rating, and their full review.",
  );
  out.push("");
  for (const t of sortedTestimonials) {
    const place = [t.data.venue, t.data.location].filter(Boolean).join(", ");
    out.push(`### ${t.data.coupleName}`);
    out.push(`URL: ${SITE}/weddingtestimonials/${t.id}`);
    if (place) out.push(`Venue: ${place}`);
    if (typeof t.data.rating === "number") out.push(`Rating: ${t.data.rating}/5`);
    if (t.data.pubDate) out.push(`Date: ${fmt(t.data.pubDate)}`);
    if (t.body && t.body.trim().length > 0) {
      out.push("");
      out.push(cleanMarkdown(t.body));
    }
    out.push("");
    out.push("---");
    out.push("");
  }

  return new Response(out.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
