import { redirects } from '../data/redirects.json';
import shared from '../../content/published/shared.json';
import manifest from '../../content/published/manifest.json';

export function publicRoute(url: URL) {
  if (url.hostname === 'www.marriedbyjake.com') {
    const canonical = new URL(url); canonical.hostname = 'marriedbyjake.com';
    return { redirect: canonical.href, status: 301 };
  }
  const pathname = url.pathname;
  if (pathname.startsWith('/_emdash/') || pathname.startsWith('/_preview/') || pathname === '/_image') return { dynamic: true };
  if (pathname !== '/' && pathname.endsWith('/')) {
    const canonical = new URL(url); canonical.pathname = pathname.replace(/\/+$/, '');
    return { redirect: canonical.href, status: 301 };
  }
  const redirect = [...shared.redirects, ...redirects].find(({ source }) => source.endsWith(':path*') ? pathname.startsWith(source.slice(0,-6)) : source === pathname);
  if (redirect) return { redirect: redirect.destination, status: 301 };
  // Internal pagination assets have public query canonicals, never public aliases.
  if (pathname.startsWith('/__published/')) return { denied: 404 };
  // Old signed URLs must not silently display a public page as a draft preview.
  if (url.searchParams.has('_preview') || url.searchParams.has('_edit')) return { denied: 403 };
  if (pathname.endsWith('.html') && !pathname.startsWith('/_astro/')) {
    const canonical = new URL(url); canonical.pathname = pathname === '/index.html' ? '/' : pathname.slice(0,-5);
    return { redirect: canonical.href, status: 301 };
  }
  if (pathname === '/weddingtestimonials') {
    const count = Math.max(1, Math.ceil(manifest.counts.weddingtestimonials / 24));
    const value = url.searchParams.get('page');
    const parsed = value && /^\d+$/.test(value) ? Number(value) : 1;
    const page = Math.min(count, Math.max(1, parsed));
    if (url.searchParams.has('page') && (value !== String(page) || page === 1)) return { redirect: page === 1 ? pathname : `${pathname}?page=${page}`, status: 302 };
    return { asset: page === 1 ? '/weddingtestimonials.html' : `/__published/testimonial-pages/${page}.html` };
  }
  return { asset: pathname === '/' ? '/index.html' : /\.[^/]+$/.test(pathname) ? pathname : `${pathname}.html` };
}
