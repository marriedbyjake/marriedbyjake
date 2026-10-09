import type { CmsEntry } from "./cms";

export function paginateTestimonials(entries: CmsEntry<"weddingtestimonials">[], requestedPage: string | null) {
  const byDate = (a: CmsEntry<"weddingtestimonials">, b: CmsEntry<"weddingtestimonials">) =>
    new Date(b.data.pubDate || 0).getTime() - new Date(a.data.pubDate || 0).getTime();
  const ordered = [
    ...entries.filter((t) => t.data.featured).sort(byDate),
    ...entries.filter((t) => !t.data.featured && t.data.image?.url).sort(byDate),
    ...entries.filter((t) => !t.data.featured && !t.data.image?.url).sort(byDate),
  ];
  const perPage = 24;
  const pageCount = Math.max(1, Math.ceil(ordered.length / perPage));
  const parsed = requestedPage && /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
  const page = Math.min(pageCount, Math.max(1, parsed));
  const visible = ordered.slice((page - 1) * perPage, page * perPage);
  return {
    featuredTestimonials: visible.filter((t) => t.data.featured),
    otherTestimonialsWithImages: visible.filter((t) => !t.data.featured && t.data.image?.url),
    otherTestimonialsWithoutImages: visible.filter((t) => !t.data.featured && !t.data.image?.url),
    page, pageCount, total: ordered.length,
    start: ordered.length ? (page - 1) * perPage + 1 : 0,
    end: Math.min(page * perPage, ordered.length),
  };
}
