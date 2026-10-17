import { publicRoute } from './lib/published-routing';

// An isolated public-content latency experiment, never a CMS or cutover entry.
// Keep its whole upload independent of Astro, EmDash, Node and private bindings.
const pilotPolicy = "default-src 'self'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; media-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; frame-ancestors 'none'";

export default {
  async fetch(request: Request, env: Pick<Env, 'ASSETS'>) {
    const url = new URL(request.url);
    const route = publicRoute(url);
    let response: Response;
    if (route.redirect) {
      response = new Response(null, { status: route.status, headers: { Location: route.redirect } });
    } else if (route.denied || route.dynamic) {
      response = new Response('Unavailable', { status: route.denied || 404, headers: { 'Cache-Control': 'private, no-store' } });
    } else if (!['GET', 'HEAD'].includes(request.method)) {
      response = new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    } else if (url.pathname === '/robots.txt') {
      response = new Response(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
    } else {
      url.pathname = route.asset!;
      url.search = '';
      const asset = await env.ASSETS.fetch(url.href, { method: request.method, headers: request.headers });
      const headers = new Headers(asset.headers);
      if (!route.asset!.startsWith('/_astro/')) headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response = new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('Content-Security-Policy', pilotPolicy);
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
