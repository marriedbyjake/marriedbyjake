import { createHash } from 'node:crypto';

export const collections = {
  infopages: ['page', 'pub_date', 'content'],
  posts: ['title', 'pub_date', 'description', 'featured_image', 'tags', 'youtube_url', 'content'],
  pricing: ['title', ...['australian', 'international', 'mc'].flatMap(group => ['title','price','description'].map(field => `${group}_${field}`))],
  readings: ['title', 'author', 'order', 'content'],
  services: ['title', 'summary', 'description', 'order', 'featured_image', 'icon', 'content'],
  weddingtestimonials: ['couple_name', 'venue', 'location', 'featured_image', 'featured', 'rating', 'pub_date', 'latitude', 'longitude', 'content'],
};
// Only values that are safe to publish. Credentials/plugin configuration are never selected.
export const publicSettingNames = ['emdash:site_title', 'emdash:site_tagline', 'emdash:locale'];
// The existing templates use repository navigation, not CMS menu assignments.
export const publicMenuNames = [];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const digest = value => sha256(JSON.stringify(canonical(value)));
export const json = value => JSON.stringify(canonical(value), null, 2) + '\n';
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
export function verifyMedia(bytes, expected, expectedSize) {
  if (bytes.length !== expectedSize) throw new Error('Media size changed while preparing a release');
  const [algorithm, wanted] = expected?.includes(':') ? expected.split(':', 2) : ['sha256', expected];
  if (!['sha256','sha1'].includes(algorithm) || !wanted || createHash(algorithm).update(bytes).digest('hex') !== wanted) throw new Error('Media checksum changed while preparing a release');
  return sha256(bytes);
}
function validSlug(slug) {
  return typeof slug === 'string' && slug.split('/').every(part => /^[\p{L}\p{N}_-]+$/u.test(part));
}
function assertPublicText(value) {
  if (typeof value === 'string' && /(?:[?&]_preview=|ec_pat_|ec_oat_)/.test(value)) throw new Error('A private preview/token reference cannot enter a public release');
  if (Array.isArray(value)) value.forEach(assertPublicText);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertPublicText);
}
function referencedMedia(value, media, found) {
  if (Array.isArray(value)) return value.forEach(child => referencedMedia(child, media, found));
  if (!value || typeof value !== 'object') return;
  if (value.id && (value.provider === 'local' || value.meta?.storageKey)) {
    if (!media.has(value.id)) throw new Error('Published content references missing media');
    found.add(value.id);
  }
  if (value._type === 'image' && value.asset?._ref) {
    if (value.asset.provider && value.asset.provider !== 'local') throw new Error('An external media provider needs an explicit static renderer before publication');
    if (!media.has(value.asset._ref)) throw new Error('Published content references missing media');
    found.add(value.asset._ref);
  }
  Object.values(value).forEach(child => referencedMedia(child, media, found));
}

/** A private CMS snapshot becomes lossless, explicitly published Git data. */
export async function projectPublished(snapshot, loadMedia, options = {}) {
  const tables = snapshot.tables;
  if (!tables || !Array.isArray(tables.media) || !Array.isArray(tables.revisions)) throw new Error('Incomplete CMS snapshot');
  const media = new Map(tables.media.map(item => [item.id, item]));
  const revisions = new Map(tables.revisions.map(item => [item.id, item]));
  const result = { formatVersion: 1, collections: {}, media: {}, shared: { settings: {}, menus: [], menuItems: [], taxonomies: [], assignments: [], redirects: [] } };
  const usedMedia = new Set();
  for (const [name, fields] of Object.entries(collections)) {
    const rows = tables[`ec_${name}`];
    if (!Array.isArray(rows)) throw new Error(`Missing collection ${name}`);
    const entries = {};
    for (const row of rows) {
      if (row.status !== 'published' || row.deleted_at) continue;
      if (!validSlug(row.slug) || Object.hasOwn(entries, row.slug)) throw new Error(`Invalid/duplicate published slug in ${name}`);
      const data = {};
      for (const field of fields) {
        if (!Object.hasOwn(row, field)) throw new Error(`Missing ${name}.${field}`);
        data[field] = ['content','featured_image','tags'].includes(field) && row[field] != null ? parse(row[field]) : row[field];
      }
      if (name !== 'pricing' && !Array.isArray(data.content)) throw new Error(`Missing rich content in ${name}/${row.slug}`);
      // Draft saves can advance updated_at; use only the published revision's date.
      const updatedAt = revisions.get(row.live_revision_id)?.created_at || row.published_at || row.created_at;
      entries[row.slug] = { cmsId: row.id, updatedAt, publishedAt: row.published_at, data };
      assertPublicText(data);
      referencedMedia(data, media, usedMedia);
    }
    result.collections[name] = Object.fromEntries(Object.entries(entries).sort(([a],[b]) => a.localeCompare(b, 'en')));
  }
  if (!result.collections.pricing.index) throw new Error('The published pricing entry is missing');
  const publishedIds = new Set(Object.values(result.collections).flatMap(entries => Object.values(entries).map(entry => entry.cmsId)));
  const assignments = (tables.content_taxonomies || []).filter(row => publishedIds.has(row.entry_id) && row.status === 'published' && !row.deleted_at);
  const terms = new Map((tables.taxonomies || []).map(row => [row.id,row]));
  const usedTerms = new Set(assignments.map(row => row.taxonomy_id));
  for (const id of usedTerms) {
    const parent = terms.get(id)?.parent_id;
    if (parent && !usedTerms.has(parent)) usedTerms.add(parent);
  }
  result.shared.taxonomies = [...usedTerms].sort().map(id => {
    const row = terms.get(id); if (!row) throw new Error('Missing published taxonomy');
    return Object.fromEntries(['id','name','slug','label','parent_id','data','locale','translation_group','sort_order'].map(key => [key, key === 'data' && row[key] ? parse(row[key]) : row[key] ?? null]));
  });
  result.shared.assignments = assignments.map(row => ({ collection:row.collection, entryId:row.entry_id, taxonomyId:row.taxonomy_id })).sort((a,b) => json(a).localeCompare(json(b)));
  for (const row of tables.options || []) if (publicSettingNames.includes(row.name)) result.shared.settings[row.name] = parse(row.value);
  result.shared.menus = (tables._emdash_menus || []).filter(row => publicMenuNames.includes(row.name)).map(row => ({id:row.id,name:row.name,label:row.label,locale:row.locale}));
  const publicMenus = new Set(result.shared.menus.map(row => row.id));
  result.shared.menuItems = (tables._emdash_menu_items || []).filter(row => publicMenus.has(row.menu_id)).map(row => Object.fromEntries(['id','menu_id','parent_id','sort_order','type','reference_collection','reference_id','custom_url','label','title_attr','target','css_classes','locale'].map(key => [key,row[key] ?? null])));
  if ((tables._emdash_redirects || []).some(row => row.enabled && row.is_pattern)) throw new Error('Pattern CMS redirects require an explicit edge renderer before publication');
  result.shared.redirects = (tables._emdash_redirects || []).filter(row => row.enabled).map(row => ({source:row.source,destination:row.destination,type:row.type,isPattern:!!row.is_pattern})).sort((a,b) => a.source.localeCompare(b.source));
  assertPublicText(result.shared);
  const assets = new Map();
  for (const id of [...usedMedia].sort()) {
    const row = media.get(id);
    if (!row || !['image/jpeg','image/png','image/webp'].includes(row.mime_type)) throw new Error('Unsupported or missing published image');
    const resolved = options.resolveMedia ? await options.resolveMedia(row) : undefined;
    const bytes = resolved ? undefined : await loadMedia(row);
    const hash = resolved?.hash || verifyMedia(bytes, row.content_hash, row.size);
    if (!/^[a-f0-9]{64}$/.test(hash) || (!row.content_hash.includes(':') && row.content_hash !== hash)) throw new Error('Invalid verified media hash');
    const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[row.mime_type];
    const asset = `${hash}.${ext}`;
    if (bytes && options.retainAssets !== false) assets.set(asset, bytes);
    result.media[id] = { id, asset, sha256:hash, sourceHash:row.content_hash, size:row.size, sourceStorageKey:row.storage_key, width:row.width, height:row.height, mimeType:row.mime_type, alt:row.alt || '', caption:row.caption || '', focalX:row.focal_x, focalY:row.focal_y, blurhash:row.blurhash, dominantColor:row.dominant_color };
  }
  // No timestamps or private revision pointers in the content digest.
  const contentHash = digest(result);
  return { release: result, contentHash, assets };
}

/** One read statement gives one SQLite snapshot; never run migrations for export. */
export function snapshotSql({ fingerprint = false } = {}) {
  const aggregate = (table, fields, where='') => `(SELECT json_group_array(json_object(${fields.flatMap(field => [`'${field}'`, `t.\"${field}\"`]).join(',')})) FROM \"${table}\" t ${where})`;
  const parts = [];
  for (const [name, fields] of Object.entries(collections)) {
    parts.push(`'ec_${name}'`, `json(${aggregate(`ec_${name}`, ['id','slug','status','deleted_at','created_at','published_at','live_revision_id',...(fingerprint ? [] : fields)], "WHERE t.status='published' AND t.deleted_at IS NULL")})`);
  }
  parts.push("'media'", `json(${aggregate('media',['id','filename','mime_type','size','width','height','alt','caption','storage_key','content_hash','focal_x','focal_y','blurhash','dominant_color'])})`);
  parts.push("'revisions'", fingerprint ? "json('[]')" : `json(${aggregate('revisions',['id','created_at'], `WHERE ${Object.keys(collections).map(name => `t.id IN (SELECT live_revision_id FROM ec_${name} WHERE status='published' AND deleted_at IS NULL)`).join(' OR ')}`)})`);
  for (const [table,fields] of Object.entries({
    options:['name','value'],
    _emdash_menus:['id','name','label','locale'],
    _emdash_menu_items:['id','menu_id','parent_id','sort_order','type','reference_collection','reference_id','custom_url','label','title_attr','target','css_classes','locale'],
    taxonomies:['id','name','slug','label','parent_id','data','locale','translation_group','sort_order'],
    content_taxonomies:['collection','entry_id','taxonomy_id','status','deleted_at'],
    _emdash_redirects:['source','destination','type','is_pattern','enabled'],
  })) {
    const where = table === 'options' ? `WHERE t.name IN (${publicSettingNames.map(name=>`'${name}'`).join(',')})` : '';
    parts.push(`'${table}'`, `json(${aggregate(table,fields,where)})`);
  }
  return `SELECT json_object('tables',json_object(${parts.join(',')})) AS snapshot;`;
}

/** The same canonical Git files are used by local export and runtime publishing. */
export function releaseFiles(projected) {
  const files = {};
  for (const [name, entries] of Object.entries(projected.release.collections)) files[`${name}.json`] = json({formatVersion:1,entries});
  files['media.json'] = json({formatVersion:1,items:projected.release.media});
  files['shared.json'] = json({formatVersion:1,...projected.release.shared});
  const counts = Object.fromEntries(Object.entries(projected.release.collections).map(([name,entries])=>[name,Object.keys(entries).length]));
  files['manifest.json'] = json({formatVersion:1,contentHash:projected.contentHash,counts,files:Object.fromEntries(Object.entries(files).map(([name,body])=>[name,sha256(body)]))});
  return {files,counts};
}
