import redirectData from "../data/redirects.json" with { type: "json" };

const origin = "https://marriedbyjake.com";
const exactRedirects = new Map(redirectData.redirects.filter(rule => !rule.source.includes(":"))
  .map(rule => [rule.source.replace(/\/+$/, "") || "/", rule.destination]));

/** Public content links point directly to canonical routes, retaining queries/fragments. */
export function canonicalInternalLink(href: string): string {
  if (!href || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href)) return href;
  let url: URL;
  try { url = new URL(href, origin); } catch { return href; }
  if (!["marriedbyjake.com", "www.marriedbyjake.com"].includes(url.hostname)) return href;
  if (url.pathname.startsWith("/_emdash/")) return href;
  let pathname = url.pathname.replace(/\/+$/, "") || "/";
  const visited = new Set<string>();
  while (exactRedirects.has(pathname) && !visited.has(pathname)) {
    visited.add(pathname);
    pathname = exactRedirects.get(pathname)!.replace(/\/+$/, "") || "/";
  }
  return pathname + url.search + url.hash;
}

/** Includes Portable Text links, image captions, embeds and nested CMS blocks. */
export function canonicalContentLinks<T>(value: T): T {
  if (Array.isArray(value)) return value.map(canonicalContentLinks) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === "href" && typeof item === "string" ? canonicalInternalLink(item) : canonicalContentLinks(item),
  ])) as T;
}
