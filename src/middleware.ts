import { defineMiddleware } from "astro:middleware";
import { redirects } from "./data/redirects.json";

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.hostname === "www.marriedbyjake.com") {
    const canonical = new URL(context.url);
    canonical.hostname = "marriedbyjake.com";
    return context.redirect(canonical.toString(), 301);
  }
  const pathname = context.url.pathname;
  if (!pathname.startsWith("/_emdash/") && pathname !== "/" && pathname.endsWith("/")) {
    const canonical = new URL(context.url);
    canonical.pathname = pathname.replace(/\/+$/, "");
    return context.redirect(canonical.toString(), 301);
  }
  const redirect = redirects.find(({ source }) => source.endsWith(":path*")
    ? pathname.startsWith(source.slice(0, -6))
    : source === pathname);
  if (redirect) return context.redirect(redirect.destination, 301);
  const response = await next();
  // Fingerprinted source assets cannot contain CMS drafts. Preserve Astro's
  // immutable browser cache for their transforms; CMS media stays private.
  const imageSource = context.url.searchParams.get("href");
  if (pathname === "/_image" && imageSource && /^\/_astro\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/.test(imageSource)
    && response.ok && !response.headers.has("Set-Cookie")
    && response.headers.get("Content-Type")?.startsWith("image/")) return response;
  // Public pages always see the latest publication; previews and admin stay private.
  // Cloudflare cache hits have immutable headers, so copy before changing them.
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
