import { defineMiddleware } from "astro:middleware";
import { redirects } from "./data/redirects.json";
import { getRequestContext, getEmDashEntry } from 'emdash';
import { mediaRequest, authorizeMedia, privateHeaders, committedMediaRedirect } from './lib/media-access.mjs';
import { committedMedia } from './lib/published-media';
import { isEditor } from './lib/editor-auth';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.hostname === "www.marriedbyjake.com") {
    const canonical = new URL(context.url);
    canonical.hostname = "marriedbyjake.com";
    return context.redirect(canonical.toString(), 301);
  }
  const pathname = context.url.pathname;
  const target = mediaRequest(context.url);
  if (target) {
    const editor = await isEditor(context);
    const preview = getRequestContext()?.preview;
    // Historical public originals resolve to immutable Git bytes, never a
    // replaceable R2 key that might now belong to a private revision.
    const committed = !editor && !preview && target.key ? committedMedia(target.key) : undefined;
    const location = committedMediaRedirect(target,committed,context.url);
    if (location) return new Response(null,{status:302,headers:{...privateHeaders,Location:location}});
    const allowed = await authorizeMedia({target,editor,preview,
      loadEntry:async (collection: string,id: string) => (await getEmDashEntry(collection,id)).entry,
      loadMedia:async (key: string) => context.locals.emdash?.db.selectFrom('media').select('id').where('storage_key','=',key).executeTakeFirst(),
    });
    if (!allowed) return new Response('Not found',{status:404,headers:privateHeaders});
  }
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
  headers.set('Referrer-Policy','no-referrer');
  if (pathname.startsWith('/_preview/') || pathname.startsWith('/_publishing') || target) headers.set('X-Robots-Tag','noindex, nofollow');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
