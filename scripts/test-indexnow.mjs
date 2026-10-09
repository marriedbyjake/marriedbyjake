import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { site, key } = JSON.parse(await readFile(new URL('../src/data/indexnow.json',import.meta.url),'utf8'));
const originalFetch = globalThis.fetch;
const originalArgs = process.argv;
let posts = [];
for (const scenario of ['accepted', 'pending', 'invalid-key', 'rate-limit', 'bad-file', 'foreign-url', 'dry-run']) {
 posts = [];
 process.argv = scenario === 'dry-run' ? ['node','test','--dry-run'] : ['node','test'];
 globalThis.fetch = async (url, options) => {
  if(url.endsWith('.txt')) return new Response(scenario === 'bad-file' ? 'incorrect' : key);
  if(url.endsWith('.xml')) return new Response(`<urlset><url><loc>${scenario === 'foreign-url' ? 'https://example.com' : site}/</loc></url><url><loc>${site}/</loc></url></urlset>`);
  posts.push(url);
  const payload = JSON.parse(options.body);
  assert.deepEqual(payload.urlList,[`${site}/`]);
  assert.equal(payload.host,new URL(site).host);
  assert.equal(payload.keyLocation,`${site}/${key}.txt`);
  if(scenario === 'rate-limit') return new Response('',{status:429});
  if(scenario === 'invalid-key') return Response.json({errorCode:'InvalidKey'},{status:403});
  if(scenario === 'pending' && url.includes('api.indexnow.org')) return Response.json({errorCode:'SiteVerificationNotCompleted'},{status:403});
  return new Response('',{status:202});
 };
 const run = import(`./submit-indexnow.mjs?test=${scenario}`);
 if(['invalid-key','rate-limit','bad-file','foreign-url'].includes(scenario)) await assert.rejects(run);
 else await run;
 assert.equal(posts.length,scenario === 'pending' ? 2 : ['accepted','invalid-key','rate-limit'].includes(scenario) ? 1 : 0);
 if(scenario === 'pending') assert.equal(posts[1],'https://yandex.com/indexnow');
}
globalThis.fetch = originalFetch;
process.argv = originalArgs;
console.log('IndexNow checks passed: acceptance, pending-verification fallback, no fallback for invalid keys/rate limits, validation, deduplication and dry run.');
