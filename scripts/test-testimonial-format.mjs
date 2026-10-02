import assert from 'node:assert/strict';
import fs from 'node:fs';
import { linkTestimonialReview } from '../src/lib/testimonial-inline-links.ts';
import { formatTestimonial } from '../src/lib/testimonial-format.ts';
import { canonicalContentLinks, canonicalInternalLink } from '../src/lib/internal-links.ts';
const block = (text, extra = {}) => ({ _type: 'block', _key: text.slice(0, 8), style: 'normal', children: [{ _type: 'span', text }], ...extra });
const text = (blocks) => blocks.flatMap(b => b.children || []).map(span => span.text || '').join('');
const input = [block('Every word stays.\nIncluding this line.'), block('Photographer: Figtree PicturesVideographer: Anthony Jackson\nMusician: McGee Entertainment')];
const before = JSON.stringify(input);
const formatted = formatTestimonial(input, 'new-testimonial');
assert.equal(JSON.stringify(input), before, 'Rendering must not mutate published content');
assert.equal(formatted.reviewText, 'Every word stays.\n\nIncluding this line.');
assert.deepEqual(formatted.credits.map(c => c.role), ['Photographer', 'Videographer', 'Musician']);
assert.deepEqual(formatted.credits.map(c => text(c.content)), ['Figtree Pictures', 'Anthony Jackson', 'McGee Entertainment']);
assert.equal(formatted.credits[1].content[0].markDefs.at(-1).href, 'https://www.wildlyeverafterweddings.com/');
const rich = block('', { children: [{ _type: 'span', text: 'Jake was ', marks: [] }, { _type: 'span', text: 'wonderful.', marks: ['strong', 'a'] }], markDefs: [{ _type: 'link', _key: 'a', href: '/faq' }] });
assert.deepEqual(formatTestimonial([rich], 'new').review[0].children.map(s => s.marks), [[], ['strong', 'a']]);
assert.equal(formatTestimonial([block('Worries before meeting Jake: would it feel personal?')], 'new').credits.length, 0);
assert.equal(formatTestimonial([block('Thank you!'), block('++Venue - Ocean View Estates++')], 'new').credits[0].role, 'Venue');
const unavailable = JSON.parse(fs.readFileSync(new URL('../src/data/unavailable-vendor-urls.json', import.meta.url), 'utf8'));
const deadCredit = block('', { children: [{ _type: 'span', text: 'Photographer: Unknown Vendor', marks: ['dead'] }], markDefs: [{ _type: 'link', _key: 'dead', href: unavailable[0] }] });
const cleanCredit = formatTestimonial([block('Thank you.'), deadCredit], 'new').credits[0].content[0];
assert.ok(!cleanCredit.markDefs.some(def => def.href === unavailable[0]), 'Dead websites must not be rendered as links');
assert.ok(!cleanCredit.children.some(span => span.marks?.includes('dead')), 'Removed links must not leave unresolved marks');
assert.equal(canonicalInternalLink('https://www.marriedbyjake.com/faq/?question=1#answer'), '/faq?question=1#answer');
assert.equal(canonicalInternalLink('/enquiries/'), '/contact');
assert.equal(canonicalInternalLink('https://vendor.example/weddings/'), 'https://vendor.example/weddings/');
assert.equal(canonicalInternalLink('/'), '/');
assert.equal(canonicalInternalLink('#vows'), '#vows');
assert.equal(canonicalContentLinks([{ markDefs: [{ href: '/weddingtestimonials/' }] }])[0].markDefs[0].href, '/weddingtestimonials');
const inlineInput = [block('', { children: [
  { _type: 'span', _key: 'a', text: 'Our wedding ', marks: ['em'] },
  { _type: 'span', _key: 'b', text: 'celebrant was wonderful.', marks: ['strong'] },
] })];
const inlineBefore = JSON.stringify(inlineInput);
const inlineLinked = linkTestimonialReview(inlineInput, 'new-testimonial');
assert.equal(text(inlineLinked), text(inlineInput), 'Inline links must preserve every word');
assert.equal(JSON.stringify(inlineInput), inlineBefore, 'Inline linking must not mutate CMS content');
assert.equal(inlineLinked[0].markDefs[0].href, '/wedding-celebrant');
assert.ok(inlineLinked[0].children.find(s => s.text === 'wedding ').marks.includes('em'));
assert.ok(inlineLinked[0].children.find(s => s.text === 'celebrant').marks.includes('strong'));
const alreadyLinked = block('celebrant', { children: [{ _type: 'span', text: 'celebrant', marks: ['existing'] }], markDefs: [{ _type: 'link', _key: 'existing', href: '/faq' }] });
assert.deepEqual(linkTestimonialReview([alreadyLinked], 'new-testimonial'), [alreadyLinked]);
assert.equal(linkTestimonialReview([block('Jake made the day wonderful!')], 'new-testimonial')[0].markDefs, undefined, 'Do not force links onto unrelated words');
if (process.argv[2]) {
  const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const compact = s => s.replace(/\+\+/g, '').replace(/\s/g, '');
  let creditPages = 0;
  let linkedReviews = 0;
  const inlineTargets = {};
  for (const row of rows) {
    const { review, credits, reviewText } = formatTestimonial(row.content, row.slug, row.venue);
    assert.ok(reviewText, `Missing review: ${row.slug}`);
    const linked = linkTestimonialReview(review, row.slug);
    assert.equal(text(linked), text(review), `Inline links changed wording: ${row.slug}`);
    const links = linked.flatMap(b => (b.markDefs || []).filter(d => d._key.includes('-review-link-')));
    assert.ok(links.length <= 2, `Too many review links: ${row.slug}`);
    if (links.length) linkedReviews++;
    for (const link of links) {
      assert.ok(!link.href.endsWith('/'), `Trailing slash in review link: ${row.slug}`);
      inlineTargets[link.href] = (inlineTargets[link.href] || 0) + 1;
    }
    const original = compact(text(row.content));
    const quote = compact(text(review));
    assert.ok(original.startsWith(quote), `Review words changed: ${row.slug}`);
    assert.ok(!/(?:Photographer|Videographer|Florist)\s*[:：]/i.test(reviewText), `Credits inside quote: ${row.slug}`);
    // Every vendor name and word remains in order (role labels move to <dt>).
    let offset = quote.length;
    for (const credit of credits) {
      const name = compact(text(credit.content));
      const index = original.indexOf(name, offset);
      assert.ok(index >= offset, `Vendor content changed: ${row.slug}: ${name}`);
      offset = index + name.length;
    }
    if (credits.length) creditPages++;
  }
  console.log(`Verified unchanged review words across ${rows.length} CMS testimonials; ${creditPages} wedding teams; ${linkedReviews} reviews with natural inline links.`, inlineTargets);
}
console.log('Testimonial formatting and canonical content links passed.');
