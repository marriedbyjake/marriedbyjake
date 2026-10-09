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
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList }),
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow submission failed: HTTP ${response.status}. Deployment already succeeded; retry with npm run indexnow.`);
    }
    console.log(`IndexNow: submitted ${urlList.length} published URLs (HTTP ${response.status}${response.status === 202 ? ', key validation pending' : ''}).`);
  }
}
