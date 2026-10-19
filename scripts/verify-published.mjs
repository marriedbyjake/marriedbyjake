import fs from 'node:fs/promises';
import path from 'node:path';
import { collections, legacyCollectionNames, digest, sha256 } from './lib/published-content.mjs';

export async function verifyPublished(root = '.') {
  const directory = path.join(root, 'content/published');
  const read = name => fs.readFile(path.join(directory, name), 'utf8');
  const manifest = JSON.parse(await read('manifest.json'));
  if (manifest.formatVersion !== 1) throw Error('Unknown release format');
  const names = Object.hasOwn(manifest.counts,'website') ? Object.keys(collections) : legacyCollectionNames;
  const expectedFiles = [...names.map(name => `${name}.json`),'media.json','shared.json'].sort();
  if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(expectedFiles)) throw Error('Incomplete release manifest');
  const release = {formatVersion:1, collections:{}, media:{}, shared:{}};
  for (const name of expectedFiles) {
    const body = await read(name);
    if (sha256(body) !== manifest.files[name]) throw Error(`Release checksum mismatch: ${name}`);
    const data = JSON.parse(body);
    if (data.formatVersion !== 1) throw Error('Unknown collection format');
    if (name === 'media.json') release.media = data.items;
    else if (name === 'shared.json') { const {formatVersion, ...shared} = data; release.shared = shared; }
    else {
      const collection = name.slice(0,-5);
      release.collections[collection] = data.entries;
      if (Object.keys(data.entries).length !== manifest.counts[collection]) throw Error(`Release count mismatch: ${collection}`);
    }
  }
  if (release.collections.website) {
    const {validateWebsiteEntry,websiteDefaults} = await import('./lib/website-model.mjs');
    for(const slug of Object.keys(websiteDefaults)) { const entry=release.collections.website[slug]; if(!entry)throw Error(`Missing website section ${slug}`); validateWebsiteEntry(slug,entry.data); }
  }
  if (!release.collections.pricing.index) throw Error('Published pricing is required');
  if (digest(release) !== manifest.contentHash) throw Error('Release digest mismatch');
  const images = new Set();
  for (const media of Object.values(release.media)) {
    if (!/^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(media.asset)) throw Error('Invalid release image path');
    if (sha256(await fs.readFile(path.join(root,'src/images/published',media.asset))) !== media.sha256) throw Error('Published image checksum mismatch');
    images.add(media.asset);
  }
  const actual = await fs.readdir(path.join(root,'src/images/published'));
  if (actual.some(name => !images.has(name))) throw Error('Unreferenced image in public release');
  return manifest;
}
if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const manifest = await verifyPublished();
  console.log(JSON.stringify({verified:true,contentHash:manifest.contentHash,counts:manifest.counts}));
}
