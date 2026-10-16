import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/testimonial-map.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { testimonialMapLocations } = await import(`data:text/javascript,${encodeURIComponent(output)}`);
const entry = (id, extra = {}) => ({ id, data: { venue: 'Shared venue', location: 'Brisbane, Queensland', latitude: -27, longitude: 153, coupleName: 'Alex & Sam', ...extra } });
const key = 'Shared venue, Brisbane, Queensland';
const grouped = testimonialMapLocations([
  entry('first-review'), entry('second-review', { coupleName: 'Jo & Lee', latitude: undefined, longitude: undefined }),
  entry('first-review'), entry(undefined), entry(''), entry('../escape'), entry('https://other.example/review'),
]);
assert.deepEqual(grouped[key].reviews, [
  ['first-review', 'Alex & Sam'],
  ['second-review', 'Jo & Lee'],
]);
assert.equal(Object.keys(grouped).length, 1);
assert.deepEqual(testimonialMapLocations([entry(undefined)])[key].reviews, []);
assert.equal(testimonialMapLocations([entry('missing-name', { coupleName: '' })])[key].reviews[0][1], 'Wedding review');
assert.equal(testimonialMapLocations([entry('nested/review')])[key].reviews[0][0], 'nested/review');
assert.equal(Object.keys(testimonialMapLocations([entry('one'), entry('two', { venue: 'Other venue' }), entry('three', { location: 'Sydney, New South Wales' })])).length, 3);
assert.equal(Object.keys(testimonialMapLocations([entry('one'), entry('two', { venue: ' shared VENUE ', location: 'Brisbane,  Queensland' })])).length, 1);
for (const extra of [{ latitude: NaN }, { longitude: Infinity }, { latitude: 91 }, { longitude: -181 }, { latitude: undefined }, { latitude: null }, { venue: '', location: '' }, { venue: null, location: null }]) {
  assert.equal(Object.keys(testimonialMapLocations([entry('invalid', extra)])).length, 0);
}
const lastPosition = testimonialMapLocations([entry('first'), entry('last', { latitude: -28, longitude: 154 })])[key];
assert.deepEqual([lastPosition.lat, lastPosition.lon], [-28, 154]);
const lightweight = JSON.stringify(testimonialMapLocations([{ ...entry('one'), content: 'Long review must stay on the detail page', data: { ...entry('one').data, image: 'image.jpg' } }]));
assert.ok(!lightweight.includes('Long review') && !lightweight.includes('image.jpg'));

const component = await readFile(new URL('../src/components/testimonials/LocationsMap.astro', import.meta.url), 'utf8');
const script = component.match(/<script is:inline define:vars=\{\{ locationsData, API_KEY \}\}>([\s\S]*?)<\/script>/)[1];
const locations = testimonialMapLocations([
  entry('first-review', { coupleName: '<img src=x> & Sam' }), entry('second-review', { coupleName: 'Jo & Lee' }),
  entry(undefined, { venue: 'Unlinked venue' }),
]);
let observed;
let imports = 0;
let fitBounds = 0;
const markers = [];
const popups = [];
class TestMap { fitBounds() { fitBounds++; } }
class Marker {
  constructor(options) { this.options = options; markers.push(this); }
  addListener(name, listener) { assert.equal(name, 'click'); this.click = listener; }
}
class InfoWindow {
  constructor(options) { this.options = options; popups.push(this); }
  close() { this.closed = true; }
  setOptions(options) { Object.assign(this.options, options); }
  setContent(html) { this.content = html; }
  open(options) { this.opened = options; }
}
const google = { maps: {
  importLibrary: async () => { imports++; return { Map: TestMap, Marker }; },
  InfoWindow, LatLngBounds: class { extend() {} }, Animation: { DROP: 'drop' },
  event: { addListener() {} },
} };
runInNewContext(script, {
  API_KEY: 'synthetic-test-key', locationsData: locations, google, URLSearchParams,
  window: { google, IntersectionObserver: true },
  document: { getElementById: () => ({ dataset: {} }), addEventListener() {} },
  IntersectionObserver: class { constructor(callback) { observed = callback; } observe() {} disconnect() {} },
  console: { warn() {}, log() {}, error(error) { throw error; } },
});
assert.equal(imports, 0);
assert.equal(markers.length, 0);
observed([{ isIntersecting: true }]);
await new Promise(resolve => setImmediate(resolve));
assert.equal(imports, 2);
assert.equal(markers.length, 2);
assert.equal(popups.length, 1);
assert.equal(fitBounds, 1);
assert.ok(markers.every(marker => marker.options.optimized === false && marker.options.title));
assert.equal(popups[0].content, undefined, 'Popup HTML must be created only after activation');
markers[0].click();
const popup = popups[0];
assert.match(popup.content, /<ul aria-label="Wedding reviews"/);
const anchors = [...popup.content.matchAll(/<a\b([^>]+)>/g)].map(match => match[1]);
assert.equal(anchors.length, 3);
assert.match(anchors[0], /href="\/weddingtestimonials\/first-review"/);
assert.match(anchors[1], /href="\/weddingtestimonials\/second-review"/);
assert.ok(anchors.slice(0, 2).every(attributes => !attributes.includes('target=')));
assert.match(anchors[2], /href="https:\/\/www.google.com\/maps\/dir\/\?api=1&destination=-27,153"/);
assert.match(anchors[2], /target="_blank"/);
assert.match(popup.content, /Directions on Google Maps \(opens in a new tab\)/);
assert.ok(!popup.content.includes('<img'));
assert.match(popup.content, /&lt;img src=x&gt; &amp; Sam/);
assert.equal(popup.options.ariaLabel, `Wedding reviews at ${key}`);
assert.equal(popup.opened.shouldFocus, true);
assert.equal(popup.opened.anchor, markers[0]);
assert.match(popup.content, /max-h-64 overflow-y-auto/);
assert.ok(anchors.every(attributes => attributes.includes('min-h-11') && attributes.includes('focus-visible:outline-2')));
markers[1].click();
assert.match(popup.content, /href="\/weddingtestimonials"/);
assert.match(popup.content, /Browse all wedding reviews/);
assert.ok(!popup.content.includes('/undefined') && !popup.content.includes('../escape'));
console.log('Testimonial map passed: exact metadata groups, shared venue review lists, canonical internal destinations, missing/unsafe slugs, escaped names, optional external directions, keyboard marker/focus options, bounded popups, deferred initialization and one reused popup.');
