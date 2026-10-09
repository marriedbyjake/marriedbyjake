import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadSource(path, imports) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [specifier, replacement] of Object.entries(imports)) {
    source = source.replaceAll(`from "${specifier}"`, `from "${replacement}"`);
  }
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(output)}`);
}
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
let context = {};
let loads = 0;
let normalized = 0;
let fail = false;
globalThis.performanceCmsTest = {
  context: () => context,
  plainText: () => { normalized++; return 'Published review'; },
  load: async (_, filter) => {
    loads++;
    assert.equal(filter.status, 'published');
    return fail ? { error: new Error('unavailable') } : { entries: [{ id: 'a', data: { content: [], rating: 5 } }, { id: 'b', data: { content: [], rating: 5 } }] };
  },
};
const { getCollection } = await loadSource('../src/lib/cms.ts', {
  emdash: moduleUrl('export const getRequestContext = () => globalThis.performanceCmsTest.context(); export const getEmDashCollection = (...args) => globalThis.performanceCmsTest.load(...args); export const getEmDashEntry = () => {}; export const extractPlainText = () => globalThis.performanceCmsTest.plainText();'),
  './internal-links': moduleUrl('export const canonicalContentLinks = value => value;'),
});
const [a,b] = await Promise.all([getCollection('weddingtestimonials'), getCollection('weddingtestimonials')]);
assert.equal(loads, 1);
assert.equal(normalized, 2);
a.reverse();
assert.deepEqual(b.map(entry => entry.id), ['a','b']);
context = {};
await getCollection('weddingtestimonials');
assert.equal(loads, 2);
context = { preview: { collection: 'weddingtestimonials', id: 'a' } };
await getCollection('weddingtestimonials');
assert.equal(loads, 3);
context = {};
fail = true;
await assert.rejects(getCollection('weddingtestimonials'));
fail = false;
await getCollection('weddingtestimonials');
assert.equal(loads, 5);
delete globalThis.performanceCmsTest;

const { onRequest } = await loadSource('../src/middleware.ts', {
  'astro:middleware': moduleUrl('export const defineMiddleware = fn => fn;'),
  './data/redirects.json': moduleUrl('export const redirects = [{ source: "/old", destination: "/contact" }];'),
});
const run = (path, init = {}) => onRequest({ url: new URL(path, 'https://marriedbyjake.com'), redirect: (url,status) => new Response(null,{status,headers:{Location:url}}) }, async () => new Response('bytes', {headers: {'Cache-Control':'public, max-age=31536000, immutable','Content-Type':'image/webp',...init.headers},status:init.status ?? 200}));
for (const path of ['/', '/_emdash/admin', '/_image?href=%2F_emdash%2Fapi%2Fmedia%2Ffile%2Fimage.jpg', '/_image?href=/_astro/%252e%252e/image.jpg', '/_image?href=/_astro/../image.jpg']) {
  assert.equal((await run(path)).headers.get('Cache-Control'), 'private, no-store');
}
const staticImage = '/_image?href=/_astro/jake-menu.Bq79GrgU.jpg&w=600';
assert.match((await run(staticImage)).headers.get('Cache-Control'), /immutable/);
assert.equal((await run(staticImage,{headers:{'Set-Cookie':'test=value'}})).headers.get('Cache-Control'),'private, no-store');
assert.equal((await run(staticImage,{status:404})).headers.get('Cache-Control'),'private, no-store');
assert.equal((await run('/old')).headers.get('Location'),'/contact');
assert.equal((await run('/contact/')).headers.get('Location'),'https://marriedbyjake.com/contact');
console.log('Performance checks passed: request isolation, concurrent reads, independent arrays, error retry, private CMS/preview responses, immutable static images, redirects.');

// Exercise the actual inline map loader without making external requests.
const { runInNewContext } = await import('node:vm');
const mapSource = await readFile(new URL('../src/components/testimonials/LocationsMap.astro', import.meta.url), 'utf8');
const mapScript = mapSource.match(/<script is:inline define:vars=\{\{ locationsData, API_KEY \}\}>([\s\S]*?)<\/script>/)[1];
let observed;
let imports = 0;
let maps = 0;
const element = { dataset: {} };
const google = { maps: {
  importLibrary: async () => { imports++; return { Map: class { constructor() { maps++; } }, Marker: class {} }; },
  InfoWindow: class {}, LatLngBounds: class {},
} };
runInNewContext(mapScript, {
  API_KEY: 'synthetic-test-key', locationsData: {}, google, URLSearchParams,
  window: { google, IntersectionObserver: true },
  document: { getElementById: () => element, addEventListener() {} },
  IntersectionObserver: class { constructor(callback) { observed = callback; } observe() {} disconnect() {} },
  console: { warn() {}, log() {}, error(error) { throw error; } },
});
assert.equal(imports, 0);
observed([{ isIntersecting: false }]);
assert.equal(imports, 0);
observed([{ isIntersecting: true }]);
await new Promise(resolve => setImmediate(resolve));
assert.equal(imports, 2);
assert.equal(maps, 1);
console.log('Map loader passed: no Maps requests before intersection, initialization on approach.');
