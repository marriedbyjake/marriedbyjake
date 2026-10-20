import {pageSearch,contentSearch} from "@/lib/website";
import {isUnlistedPage} from '@/lib/page-discovery.mjs';
import type { APIRoute } from "astro";
import { getCollection } from "@/lib/cms";
import { testimonialPageCount, testimonialPageUrl } from "@/lib/testimonial-pagination";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[char]!);

export const GET: APIRoute = async ({ site }) => {
  const [posts, testimonials, services, infoPages] = await Promise.all([
    getCollection("posts"), getCollection("weddingtestimonials"),
    getCollection("services"), getCollection("infopages"),
  ]);
  const staticPaths = ["/", "/about-jake", "/contact", "/faq", "/serviceandprice", "/services", "/wedding-readings",
    "/blog", "/weddingtestimonials", "/brisbane", "/sydney", "/byron-bay", "/gold-coast", "/sunshine-coast"];
  const urls = [
    ...staticPaths.map((path) => ({ path, updatedAt: undefined as Date | undefined })),
    ...Array.from({ length: testimonialPageCount(testimonials.length) - 1 }, (_, index) => ({
      path: testimonialPageUrl(index + 2), updatedAt: undefined as Date | undefined,
    })),
    ...posts.map((entry) => ({ path: `/blog/${entry.id}`, updatedAt: entry.updatedAt })),
    ...testimonials.map((entry) => ({ path: `/weddingtestimonials/${entry.id}`, updatedAt: entry.updatedAt })),
    ...[...services, ...infoPages].map((entry) => ({ path: `/${entry.id}`, updatedAt: entry.updatedAt })),
  ];
  const visible = (await Promise.all(urls.map(async entry=>{
    if(isUnlistedPage(entry.path))return undefined;
    const clean=entry.path.split('?')[0];
    const settings=await pageSearch(clean), content=await contentSearch(clean);
    const canonical=content?.preferred_url || settings?.canonical;
    return content?.hide_from_search || settings?.no_index || (canonical && new URL(canonical,site).href !== new URL(entry.path,site).href) ? undefined : entry;
  }))).filter((entry):entry is typeof urls[number]=>!!entry);
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + visible.map(({ path, updatedAt }) => `<url><loc>${escapeXml(new URL(path, site).href)}</loc>${updatedAt ? `<lastmod>${updatedAt.toISOString()}</lastmod>` : ""}</url>`).join("")
    + "</urlset>";
  return new Response(body, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=0, must-revalidate" } });
};
