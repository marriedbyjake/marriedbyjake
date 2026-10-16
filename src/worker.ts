import { publicRoute } from "./lib/published-routing";
import type { ExportedHandler } from "@cloudflare/workers-types";

export default {
  async fetch(request, env, ctx) {
    const route = publicRoute(new URL(request.url));
    if (route.redirect) return new Response(null, { status: route.status, headers: { Location: route.redirect } });
    if (route.denied) return new Response("Unavailable", { status: route.denied, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
    if (route.asset) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      const url = new URL(request.url); url.pathname = route.asset; url.search = "";
      const response = await env.ASSETS.fetch(url.href, { method: request.method, headers: request.headers });
      const headers = new Headers(response.headers);
      if (!route.asset.startsWith("/_astro/")) headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // Keep the CMS, Astro application and publisher out of public startup.
    // ESM caches this module; request/session data stays inside each handler.
    const { default: cms } = await import("./cms-worker");
    return cms.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    const { default: cms } = await import("./cms-worker");
    return cms.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
