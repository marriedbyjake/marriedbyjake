import assert from 'node:assert/strict';
import { paginateTestimonials } from '../src/lib/testimonial-pagination.ts';

const entries = Array.from({ length: 61 }, (_, i) => ({
  id: String(i), body: `Review ${i}`,
  data: { featured: i % 10 === 0, image: i % 2 ? undefined : { url: 'image.jpg' }, pubDate: new Date(2026, 0, i + 1) },
}));
const original = entries.map((entry) => entry.id);
const visible = (result) => [...result.featuredTestimonials, ...result.otherTestimonialsWithImages, ...result.otherTestimonialsWithoutImages];
const expected = [
  ...entries.filter((t) => t.data.featured).sort((a, b) => b.data.pubDate - a.data.pubDate),
  ...entries.filter((t) => !t.data.featured && t.data.image).sort((a, b) => b.data.pubDate - a.data.pubDate),
  ...entries.filter((t) => !t.data.featured && !t.data.image).sort((a, b) => b.data.pubDate - a.data.pubDate),
];
const pages = [1, 2, 3].map((page) => paginateTestimonials(entries, String(page)));
assert.deepEqual(pages.flatMap(visible).map((entry) => entry.id), expected.map((entry) => entry.id));
assert.deepEqual(pages.map((result) => visible(result).length), [24, 24, 13]);
assert.deepEqual(pages.map(({ start, end }) => [start, end]), [[1,24], [25,48], [49,61]]);
assert.deepEqual(entries.map((entry) => entry.id), original);
for (const input of [null, '0', '-1', 'bad', '1.5']) assert.equal(paginateTestimonials(entries, input).page, 1);
for (const input of ['99', '9'.repeat(400)]) assert.equal(paginateTestimonials(entries, input).page, 3);
const empty = paginateTestimonials([], '2');
assert.deepEqual([empty.page, empty.pageCount, empty.start, empty.end], [1,1,0,0]);
console.log('Testimonial pagination passed: preserved order, complete coverage, boundaries, invalid inputs, empty collection.');
