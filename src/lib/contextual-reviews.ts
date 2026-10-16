import selections from "../data/testimonial-inline-links.json" with { type: "json" };
import { formatTestimonial } from "./testimonial-format";
import type { CmsEntry } from "./cms";

const serviceSelections = new Map<string, { href: string; text: string }[]>(Object.entries(selections));
const cities = {
  brisbane: "Brisbane",
  sydney: "Sydney",
  "byron-bay": "Byron Bay",
  "gold-coast": "Gold Coast",
  "sunshine-coast": "Sunshine Coast",
} as const;
const services = {
  "wedding-celebrant": "Wedding ceremony reviews",
  "master-of-ceremonies": "MC reviews",
  elopements: "Elopement and destination wedding reviews",
} as const;
export type ReviewContext = keyof typeof cities | keyof typeof services;
export const isReviewContext = (value: string): value is ReviewContext =>
  Object.hasOwn(cities, value) || Object.hasOwn(services, value);

const compact = (text: string) => text.replace(/\s+/g, " ").trim();
function containsPhrase(text: string, phrase: string) {
  let start = text.indexOf(phrase);
  while (phrase && start !== -1) {
    const end = start + phrase.length;
    if (!/[\p{L}\p{N}]/u.test(text[start - 1] || "") && !/[\p{L}\p{N}]/u.test(text[end] || "")) return true;
    start = text.indexOf(phrase, start + 1);
  }
  return false;
}

/** Only explicit city names in CMS location metadata; never infer from venues or coordinates. */
function matchesCity(location: string | null | undefined, city: string) {
  return (location || "").split(/[,;|/\n]/).some(part =>
    compact(part).replace(/\s+(?:QLD|NSW|Queensland|New South Wales)$/i, "").toLowerCase() === city.toLowerCase());
}

function excerpt(text: string) {
  const quote = compact(text);
  if (quote.length <= 280) return quote;
  const end = quote.lastIndexOf(" ", 280);
  // A single unusually long word is omitted rather than rewritten or split.
  return end > 0 ? quote.slice(0, end) + "…" : "";
}

export function contextualReviews(entries: CmsEntry<"weddingtestimonials">[], context: ReviewContext) {
  const city = cities[context as keyof typeof cities];
  const title = city ? `Reviews from ${city} weddings` : services[context as keyof typeof services];
  // Reject unrelated entries before formatting any rich text.
  const ordered = entries.filter(entry => city ? matchesCity(entry.data.location, city)
    : serviceSelections.get(entry.id)?.some(selection => selection.href === `/${context}`)).sort((a, b) =>
    Number(!!b.data.featured) - Number(!!a.data.featured)
    || new Date(b.data.pubDate || 0).getTime() - new Date(a.data.pubDate || 0).getTime()
    || a.id.localeCompare(b.id));
  const reviews: { id: string; coupleName: string; location?: string; excerpt: string }[] = [];
  for (const entry of ordered) {
    const { reviewText } = formatTestimonial(entry.content, entry.id, entry.data.venue || "");
    // These service associations were already reviewed for inline links. Recheck
    // the phrase against the current quote so edits and vendor credits cannot match.
    if (!city && !serviceSelections.get(entry.id)?.some(selection =>
      selection.href === `/${context}` && containsPhrase(reviewText, selection.text))) continue;
    const quote = excerpt(reviewText);
    if (!quote || !entry.data.coupleName) continue;
    reviews.push({ id: entry.id, coupleName: entry.data.coupleName, location: entry.data.location || undefined, excerpt: quote });
    if (reviews.length === 3) break;
  }
  return { title, reviews };
}
