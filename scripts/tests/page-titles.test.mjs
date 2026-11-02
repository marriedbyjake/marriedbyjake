import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataText} from '../../src/lib/metadata-text.ts';
import {inspectPageTitles, assertPageTitles} from '../lib/page-titles.mjs';

const page = (title, socialTitle = title) => `<!doctype html><html><head>
  <title>${title}</title>
  <meta property="og:title" content="${socialTitle}">
  <meta name="twitter:title" content="${socialTitle}">
</head><body></body></html>`;

test('CMS title normalization handles named, decimal and hexadecimal entities without changing plain text', () => {
  for (const [input, expected] of [
    ['Lost? Let&#39;s play a game — Married by Jake', "Lost? Let's play a game — Married by Jake"],
    ['Jake&apos;s &amp; &quot;friends&quot;', 'Jake\'s & "friends"'],
    ['Jake&#x2019;s wedding &#128155;', 'Jake’s wedding 💛'],
    ['Love & laughter <3 — café', 'Love & laughter <3 — café'],
    ['Fish &not chips', 'Fish &not chips'],
  ]) assert.equal(metadataText(input), expected);
});

test('title checks parse HTML once and reject the exact double-escaped 404 regression', () => {
  const broken = page('Lost? Let&amp;#39;s play a game — Married by Jake');
  assert.equal(inspectPageTitles(broken).title, 'Lost? Let&#39;s play a game — Married by Jake');
  assert.throws(() => assertPageTitles(broken, '/404'), /\/404:.*displays an HTML entity/);
  for (const encoded of ['&amp;apos;', '&amp;#x27;', '&amp;quot;', '&amp;amp;', '&amp;rsquo;']) {
    assert.throws(() => assertPageTitles(page(`Jake${encoded}s`), '/example'), /displays an HTML entity/);
  }
});

test('ordinary escaped punctuation and Unicode display correctly in all title fields', () => {
  assert.equal(assertPageTitles(page('Jake&#39;s &amp; &quot;friends&quot; — 💛 &lt;3'), '/example'),
    'Jake\'s & "friends" — 💛 <3');
});

test('title checks reject missing, duplicate, empty and inconsistent title fields', () => {
  for (const html of [page(''), page('Title').replace('<title>Title</title>', ''),
    page('Title').replace('</title>', '</title><title>Other</title>'),
    page('Title', 'Different'), page('Title').replace('name="twitter:title"', 'name="other"')]) {
    assert.throws(() => assertPageTitles(html, '/example'));
  }
});
