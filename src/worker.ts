import { runPublisher } from "./publishing/publisher.mjs";
import { publicRoute } from "./lib/published-routing";
import handler, { createScheduledHandler } from "@emdash-cms/cloudflare/worker";
import { timingSafeEqual } from "node:crypto";
import type { ExportedHandler } from "@cloudflare/workers-types";

type CmsWorkerEnv = Env & {
  EMDASH_SETUP_PASSWORD?: string;
};

export default {
  ...handler,
  async fetch(request, env, ctx) {
    const route = publicRoute(new URL(request.url));
    if (route.redirect) return new Response(null, { status: route.status, headers: { Location: route.redirect } });
    if (route.denied) return new Response("Unavailable", { status: route.denied, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
    if (route.asset) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      const url = new URL(request.url); url.pathname = route.asset; url.search = "";
      // Public HTML and data are immutable products of this deployment's Git
      // commit. Serve assets before EmDash, sessions or any D1 access.
      const response = await env.ASSETS.fetch(url.href, { method: request.method, headers: request.headers });
      const headers = new Headers(response.headers);
      if (!route.asset.startsWith("/_astro/")) headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
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
    return handler.fetch!(request, env, ctx);
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
