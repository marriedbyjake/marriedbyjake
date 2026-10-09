import { readFile } from 'node:fs/promises';

const { site, key } = JSON.parse(await readFile(new URL('../src/data/indexnow.json', import.meta.url), 'utf8'));
const origin = new URL(site).origin;
const keyLocation = `${origin}/${key}.txt`;
const dryRun = process.argv.includes('--dry-run');
const decodeXml = (value) => value.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
})[entity]);

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

// Verify the deployed key before notifying engines about the published site.
if ((await fetchText(keyLocation)).trim() !== key) throw new Error('The deployed IndexNow key does not match. Deploy first.');
const sitemap = await fetchText(`${origin}/sitemap-0.xml`);
if (!/<urlset\b/.test(sitemap)) throw new Error('Expected the published URL sitemap.');
const urls = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1])))];
if (!urls.length) throw new Error('The published sitemap contains no URLs.');
for (const value of urls) {
  const url = new URL(value);
  if (url.origin !== origin || url.search || url.hash || url.pathname.startsWith('/_emdash')) {
    throw new Error(`Unexpected sitemap URL: ${value}`);
  }
}
if (dryRun) {
  console.log(`IndexNow dry run: verified key and ${urls.length} canonical published URLs; no submission sent.`);
} else {
  for (let offset = 0; offset < urls.length; offset += 10_000) {
    const urlList = urls.slice(offset, offset + 10_000);
    const payload = JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList });
    const submit = (endpoint) => fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload,
      signal: AbortSignal.timeout(60_000),
    });
    let endpoint = 'https://api.indexnow.org/indexnow';
    let response = await submit(endpoint);
    if (response.status === 403) {
      const problem = await response.json().catch(() => undefined);
      // The shared endpoint rejects bulk submissions while a new site's key
      // is pending. Another official participant can accept the same batch
      // for verification and share it through IndexNow. Invalid keys still fail.
      if (problem?.errorCode === 'SiteVerificationNotCompleted') {
        endpoint = 'https://yandex.com/indexnow';
        console.log('IndexNow: shared endpoint verification pending; submitting through participant Yandex.');
        response = await submit(endpoint);
      }
    }
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow submission failed at ${endpoint}: HTTP ${response.status}. Deployment already succeeded; retry with npm run indexnow.`);
    }
    console.log(`IndexNow: submitted ${urlList.length} published URLs (HTTP ${response.status}${response.status === 202 ? ', key validation pending' : ''}).`);
  }
}
