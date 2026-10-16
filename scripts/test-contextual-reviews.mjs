import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import selections from '../src/data/testimonial-inline-links.json' with { type: 'json' };

// Match the existing performance tests: transpile this server-only module while
// resolving its real formatter/data imports for Node's native TypeScript loader.
const source = fs.readFileSync(new URL('../src/lib/contextual-reviews.ts', import.meta.url), 'utf8')
  .replace('"./testimonial-format"', JSON.stringify(new URL('../src/lib/testimonial-format.ts', import.meta.url).href))
  .replace('"../data/testimonial-inline-links.json"', JSON.stringify(new URL('../src/data/testimonial-inline-links.json', import.meta.url).href));
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { contextualReviews, isReviewContext } = await import(`data:text/javascript,${encodeURIComponent(output)}`);
const block = text => ({ _type: 'block', children: [{ _type: 'span', text }] });
const entry = (id, location, text = 'Every review word stays intact.', extra = {}) => ({
  id, data: { coupleName: id, location, pubDate: new Date('2026-01-01'), ...extra }, content: [block(text)],
});
const entries = [
  entry('older', 'Brisbane'),
  entry('featured', ' bRisBane QLD ', undefined, { featured: true }),
  entry('newer', 'Brisbane, Queensland, Australia', undefined, { pubDate: new Date('2026-10-01') }),
  entry('fourth', 'Brisbane'),
  entry('venue-only', null, undefined, { venue: 'Brisbane City Hall', latitude: -27.47, longitude: 153.03 }),
  entry('different-city', 'Sydney', 'We travelled from Brisbane.'),
  entry('ambiguous', 'Brisbane Water'),
];
const before = JSON.stringify(entries);
const result = contextualReviews(entries, 'brisbane');
assert.deepEqual(result.reviews.map(review => review.id), ['featured', 'newer', 'fourth']);
assert.equal(JSON.stringify(entries), before, 'Selection must not mutate CMS entries or ordering');
for (const context of ['sydney', 'byron-bay', 'gold-coast', 'sunshine-coast']) {
  const city = context.split('-').join(' ');
  assert.equal(contextualReviews([entry('city', city)], context).reviews.length, 1);
}
assert.deepEqual(contextualReviews(entries, 'byron-bay').reviews, []);
assert.deepEqual(contextualReviews([], 'brisbane').reviews, []);
assert.deepEqual(contextualReviews([entry('blank', 'Brisbane', '')], 'brisbane').reviews, []);
assert.equal(isReviewContext('toString'), false);
assert.equal(isReviewContext('master-of-ceremonies'), true);
assert.equal(isReviewContext('privacy'), false);

for (const service of ['wedding-celebrant', 'master-of-ceremonies', 'elopements']) {
  const [slug, choices] = Object.entries(selections).find(([, values]) => values.some(value => value.href === `/${service}`));
  const phrase = choices.find(value => value.href === `/${service}`).text;
  const review = entry(slug, 'Sydney', `We loved ${phrase}.`);
  assert.equal(contextualReviews([review], service).reviews.length, 1);
  assert.deepEqual(contextualReviews([entry(slug, 'Sydney', 'The quote has changed.')], service).reviews, []);
  assert.deepEqual(contextualReviews([entry('unreviewed', 'Sydney', phrase)], service).reviews, []);
  const creditsOnly = entry(slug, 'Sydney', 'Our day was lovely.');
  creditsOnly.content.push(block(`Photographer: ${phrase}`));
  assert.deepEqual(contextualReviews([creditsOnly], service).reviews, [], 'Credits cannot establish a service match');
  assert.deepEqual(contextualReviews([entry(slug, 'Sydney', `prefix${phrase}suffix`)], service).reviews, []);
}
const longText = 'A completely unchanged review sentence. '.repeat(20);
const long = entry('long', 'Brisbane', longText);
long.content.push(block('Photographer: Credit stays out of the excerpt'));
const quote = contextualReviews([long], 'brisbane').reviews[0].excerpt;
assert.ok(quote.length <= 281 && quote.endsWith('…'));
assert.ok(longText.startsWith(quote.slice(0, -1)), 'Excerpt must be an exact prefix at a word boundary');
assert.ok(!quote.includes('Photographer'));
console.log('Contextual reviews passed: explicit locations, reviewed services, stale/credit-only exclusions, bounded output, quote preservation, fallback and isolation.');
