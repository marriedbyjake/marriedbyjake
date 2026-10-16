import { runPublisher } from "./publishing/publisher.mjs";
import { deploymentLock } from './publishing/deployment-lock.mjs';
import handler, { createScheduledHandler } from "@emdash-cms/cloudflare/worker";
import { timingSafeEqual } from "node:crypto";
import type { ExportedHandler } from "@cloudflare/workers-types";

type CmsWorkerEnv = Env & {
  EMDASH_SETUP_PASSWORD?: string;
  PUBLISHING_BUILD_SECRET?: string;
};

export default {
  ...handler,
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/_publishing/deployment') return deploymentLock(request,env);
    const pathname = new URL(request.url).pathname;
    const needsSetupGuard = pathname.startsWith("/_emdash/admin")
      || pathname.startsWith("/_emdash/api/setup")
      || pathname.startsWith("/_emdash/api/auth");
    if (needsSetupGuard) {
      const row = await env.DB.prepare(
        "SELECT value FROM options WHERE name = 'emdash:setup_complete' AND EXISTS (SELECT 1 FROM users)",
      ).first<{ value: string }>();
      if (row?.value !== "true" && row?.value !== '"true"') {
        if (!env.EMDASH_SETUP_PASSWORD) return new Response("CMS setup access is being configured", { status: 503 });
        const encoder = new TextEncoder();
        const actual = encoder.encode(request.headers.get("Authorization") || "");
        const expected = encoder.encode(`Basic ${btoa(`setup:${env.EMDASH_SETUP_PASSWORD}`)}`);
        if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) {
          return new Response("Setup credentials required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Jake CMS setup", charset="UTF-8"', "Cache-Control": "private, no-store" },
          });
        }
      }
    }
    let cmsRequest=request;
    if (pathname === '/_image') {
      const imageURL=new URL(request.url);
      const href=imageURL.searchParams.get('href');
      if (!href || !/^\/_astro\/[a-zA-Z0-9_.-]+$/.test(href)) {
        imageURL.pathname='/_private-image';
        const RequestConstructor=request.constructor as typeof import('@cloudflare/workers-types').Request;
        cmsRequest=new RequestConstructor(imageURL.href,request);
      }
    }
    const response = await handler.fetch!(cmsRequest, env, ctx);
    if (pathname.startsWith('/_emdash/admin') && response.headers.get('Content-Type')?.includes('text/html')) {
      return new HTMLRewriter().on('head',{element(element){element.append('<link rel="stylesheet" href="/publishing-banner.css">',{html:true});}}).on('body',{element(element) {
        element.append('<script src="/publishing-banner.js" defer></script>',{html:true});
      }}).transform(response);
    }
    const token = new URL(request.url).searchParams.get('_preview');
    if (pathname.startsWith('/_preview/') && token && response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
      const authorize = (source: string) => {
        // HTMLRewriter exposes source attribute entities. Decode separators
        // before URL parsing so width/format parameters retain their names.
        const decoded=source.replace(/&(?:amp|#0*38|#x0*26);/gi,'&');
        const url = new URL(decoded,request.url);
        if (url.pathname.startsWith('/_emdash/api/media/file/')) {
          const image = new URL('/_image',request.url); image.searchParams.set('href',url.pathname); image.searchParams.set('_preview',token); return image.pathname+image.search;
        }
        const imageSource = url.pathname === '/_image' ? url.searchParams.get('href') : null;
        if (imageSource && new URL(imageSource,request.url).pathname.startsWith('/_emdash/api/media/file/')) { url.searchParams.set('_preview',token); return url.pathname+url.search; }
        return source;
      };
      return new HTMLRewriter().on('img, source',{element(element) {
        const source=element.getAttribute('src'); if(source)element.setAttribute('src',authorize(source));
        const srcset=element.getAttribute('srcset'); if(srcset)element.setAttribute('srcset',srcset.split(',').map(part=>{const [url,...size]=part.trim().split(/\s+/);return [authorize(url),...size].join(' ');}).join(', '));
      }}).transform(response);
    }
    return response;
  },
  async scheduled(controller, env, ctx) {
    // Preserve EmDash's scheduled publication and maintenance work. Publishing
    // reconciliation runs independently; a publisher failure cannot skip it.
    const outcomes = await Promise.allSettled([
      createScheduledHandler()(controller, env, ctx),
      runPublisher(env),
    ]);
    if (outcomes.some(result => result.status === "rejected")) throw new Error("Scheduled CMS or publishing work failed; inspect private status");
  },
} satisfies ExportedHandler<CmsWorkerEnv>;
