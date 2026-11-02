import test from 'node:test';
import assert from 'node:assert/strict';
import {imageSource} from '../../src/lib/image-source.ts';
import {pageMediaUrls} from '../lib/page-media.mjs';

test('social image sources preserve external URLs and resolve Astro metadata to its asset', () => {
  assert.equal(imageSource('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  assert.equal(imageSource({src: '/_astro/photo.hash.jpg', width: 1200, height: 800}), '/_astro/photo.hash.jpg');
  assert.equal(imageSource(undefined), undefined);
  assert.equal(imageSource(null), undefined);
});

test('rendered media validation rejects the blog image-object regression in either social tag', () => {
  for (const name of ['og:image', 'twitter:image']) {
    for (const bad of ['[object Object]', '[object%20Object]', '%5Bobject%20Object%5D', '']) {
      const value = bad ? `https://marriedbyjake.com/${bad}` : '';
      assert.throws(() => pageMediaUrls(`<meta property="${name}" content="${value}">`, '/blog/pets'), /\/blog\/pets: malformed media URL/);
    }
  }
});

test('media validation also checks image, video, poster and responsive sources', () => {
  for (const markup of ['<img src="[object Object]">', '<video poster="[object Object]">',
    '<source src="[object Object]">', '<img srcset="[object Object] 640w">']) {
    assert.throws(() => pageMediaUrls(markup, '/example'), /malformed media URL/);
  }
  assert.deepEqual(pageMediaUrls('<img src="/photo.webp"><meta property="og:image" content="/photo.webp"><video poster="/poster.webp"><source src="https://example.com/video.mp4?a=1&amp;b=2"></video>', '/example'),
    ['/photo.webp', '/poster.webp', 'https://example.com/video.mp4?a=1&b=2']);
});
