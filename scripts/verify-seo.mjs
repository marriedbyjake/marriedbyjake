import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(dist);
const errors = new Set();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects;
const exactRedirects = new Map(redirects.filter(r => !r.source.includes(':')).map(r => [r.source, r.destination]));
const locationLinks = new Map(['gold-coast', 'sunshine-coast', 'byron-bay', 'sydney'].map(slug => ['/' + slug, 0]));
let reviews = 0;
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const route = '/' + path.relative(dist, file).replace(/(?:\/)?index\.html$/, '').replace(/\.html$/, '');
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const raw = decode(match[1]);
    const url = new URL(raw, 'https://marriedbyjake.com' + route);
    if (url.origin !== 'https://marriedbyjake.com') continue;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname !== '/' && pathname.endsWith('/')) errors.add(`Trailing slash: ${raw}`);
    if (exactRedirects.has(pathname)) errors.add(`Link redirects: ${pathname} -> ${exactRedirects.get(pathname)}`);
    if (!fs.existsSync(path.join(dist, pathname, 'index.html')) && !fs.existsSync(path.join(dist, pathname)) && !fs.existsSync(path.join(dist, pathname + '.html'))) errors.add(`Missing link target: ${pathname}`);
    if (route.startsWith('/weddingtestimonials/') && locationLinks.has(pathname)) locationLinks.set(pathname, locationLinks.get(pathname) + 1);
  }
  if (route.startsWith('/weddingtestimonials/')) {
    reviews++;
    if (!/<blockquote\b/.test(html)) errors.add(`Missing blockquote: ${route}`);
    const title = decode(html.match(/<title>(.*?)<\/title>/)?.[1] || '');
    if (title.length > 60) errors.add(`Long testimonial title (${title.length}): ${route}`);
  }
  if (route !== '/404' && route !== '/thank-you') {
    const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
    if (description.length < 110 || description.length > 160) errors.add(`Description length ${description.length}: ${route}`);
  }
}
const sitemapUrls = files.filter(f => /sitemap.*\.xml$/.test(f)).flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])).filter(url => !url.endsWith('.xml'));
if (!sitemapUrls.length) errors.add('No sitemap URLs generated');
if (reviews !== fs.readdirSync(path.join(root, 'src/content/weddingtestimonials')).filter(f => f.endsWith('.md')).length) errors.add('Not all testimonial pages were built');
if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.add('Duplicate URLs in sitemaps');
for (const url of sitemapUrls) {
  const pathname = new URL(url).pathname;
  if (pathname !== '/' && pathname.endsWith('/')) errors.add(`Sitemap trailing slash: ${url}`);
  if (exactRedirects.has(pathname)) errors.add(`Sitemap redirect: ${url}`);
}
for (const [route, count] of locationLinks) if (!count) errors.add(`No testimonial inlinks: ${route}`);
console.log(`${reviews} testimonial pages; ${sitemapUrls.length} sitemap URLs; location inlinks:`, Object.fromEntries(locationLinks));
if (errors.size) { console.error([...errors].join('\n')); process.exitCode = 1; }
else console.log('SEO checks passed: internal links, metadata, testimonials and sitemap.');
