import redirectData from "../data/redirects.json" with { type: "json" };
import {isUnlistedPage} from './page-discovery.mjs';

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
  // Retain the exact words/emphasis of historical content while removing its
  // links to direct-only pricing. Never mutate the CMS or committed original.
  let source = value as Record<string, any>;
  if(source._type === 'block' && Array.isArray(source.markDefs)){
    const hidden = new Set(source.markDefs.filter((mark:any)=>typeof mark.href==='string'&&isUnlistedPage(mark.href)).map((mark:any)=>mark._key));
    if(hidden.size)source={...source,markDefs:source.markDefs.filter((mark:any)=>!hidden.has(mark._key)),children:source.children?.map((child:any)=>Array.isArray(child.marks)?{...child,marks:child.marks.filter((key:string)=>!hidden.has(key))}:child)};
  }
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key,
    key === "href" && typeof item === "string" ? canonicalInternalLink(item) : canonicalContentLinks(item),
  ])) as T;
}
