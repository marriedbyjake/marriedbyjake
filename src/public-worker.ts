import { publicRoute } from './lib/published-routing';

// Keep the complete public upload independent of Astro, EmDash and Node.
// Forward the original private Request so Origin, cookies, body and preview
// tokens keep their existing authentication/CSRF meaning at the CMS.
export default {
  async fetch(request: Request, env: PublicEnv) {
    const route = publicRoute(new URL(request.url));
    if (route.redirect) return new Response(null, { status: route.status, headers: { Location: route.redirect, ...(route.noIndex ? {'X-Robots-Tag':'noindex, nofollow'} : {}) } });
    if (route.denied) return new Response('Unavailable', { status: route.denied, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
    if (route.dynamic) {
      // Do not expand the trusted passkey origin to the diagnostic hostname.
      if (new URL(request.url).origin !== 'https://marriedbyjake.com') return new Response('Use the canonical editor address', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
      try { return await env.CMS.fetch(request); }
      catch { return new Response('The editor is temporarily unavailable. Please try again.', { status: 503, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'Retry-After': '60' } }); }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const diagnostic = new URL(request.url).hostname.endsWith('.workers.dev');
    if (diagnostic && new URL(request.url).pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow' } });
    const url = new URL(request.url); url.pathname = route.asset!; url.search = '';
    const response = await env.ASSETS.fetch(url.href, { method: request.method, headers: request.headers });
    const headers = new Headers(response.headers);
    if (diagnostic || route.noIndex) headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (!route.asset!.startsWith('/_astro/')) headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
