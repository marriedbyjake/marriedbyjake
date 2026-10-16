import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { site, key } = JSON.parse(await readFile(new URL('../src/data/indexnow.json', import.meta.url), 'utf8'));
const originalFetch = globalThis.fetch;
const originalArgs = process.argv;
const unexpectedUrls = {
  'foreign-url': 'https://example.com/',
  'other-query': `${site}/brisbane?page=2`,
  'filtered-page': `${site}/weddingtestimonials?page=2&sort=date`,
  'page-one-alias': `${site}/weddingtestimonials?page=1`,
  'page-zero': `${site}/weddingtestimonials?page=0`,
  'padded-page': `${site}/weddingtestimonials?page=02`,
  'fragment': `${site}/weddingtestimonials?page=2#reviews`,
  'cms-url': `${site}/_emdash/admin`,
};
try {
  for (const scenario of ['accepted', 'pending', 'invalid-key', 'rate-limit', 'bad-file', 'dry-run', 'pagination', 'pagination-dry-run', ...Object.keys(unexpectedUrls)]) {
    const posts = [];
    const expected = scenario.startsWith('pagination')
      ? [`${site}/`, `${site}/weddingtestimonials?page=2`, `${site}/weddingtestimonials?page=25`]
      : [`${site}/`];
    const sitemapUrls = unexpectedUrls[scenario] ? [unexpectedUrls[scenario]] : [...expected, expected[0]];
    process.argv = scenario.endsWith('dry-run') ? ['node', 'test', '--dry-run'] : ['node', 'test'];
    globalThis.fetch = async (url, options) => {
      if (url.endsWith('.txt')) return new Response(scenario === 'bad-file' ? 'incorrect' : key);
      if (url.endsWith('.xml')) return new Response(`<urlset>${sitemapUrls.map(value => `<url><loc>${value.replaceAll('&', '&amp;')}</loc></url>`).join('')}</urlset>`);
      posts.push(url);
      const payload = JSON.parse(options.body);
      assert.deepEqual(payload.urlList, expected);
      assert.equal(payload.host, new URL(site).host);
      assert.equal(payload.keyLocation, `${site}/${key}.txt`);
      if (scenario === 'rate-limit') return new Response('', { status: 429 });
      if (scenario === 'invalid-key') return Response.json({ errorCode: 'InvalidKey' }, { status: 403 });
      if (scenario === 'pending' && url.includes('api.indexnow.org')) return Response.json({ errorCode: 'SiteVerificationNotCompleted' }, { status: 403 });
      return new Response('', { status: 202 });
    };
    const run = import(`./submit-indexnow.mjs?test=${scenario}`);
    if (['invalid-key', 'rate-limit', 'bad-file'].includes(scenario) || unexpectedUrls[scenario]) await assert.rejects(run);
    else await run;
    assert.equal(posts.length, scenario === 'pending' ? 2 : ['accepted', 'invalid-key', 'rate-limit', 'pagination'].includes(scenario) ? 1 : 0);
    if (scenario === 'pending') assert.equal(posts[1], 'https://yandex.com/indexnow');
  }
} finally {
  globalThis.fetch = originalFetch;
  process.argv = originalArgs;
}
console.log('IndexNow checks passed: acceptance, pending-verification fallback, invalid-key/rate-limit failures, canonical pagination, rejected query aliases/filters, validation, deduplication and dry runs.');
