const prefix = '/_emdash/api/media/file/';
export const privateHeaders = {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
export function committedMediaRedirect(target, image, url) {
  if (!image) return;
  if (target.original) return image.src;
  // Compile mode's /_image fast path returns bundled originals unchanged.
  // The explicit route runs the real transformer for historical renditions.
  const destination = new URL('/_private-image',url);
  destination.searchParams.set('href',image.src);
  for (const key of ['w','h','q','f','fit']) if (url.searchParams.has(key)) destination.searchParams.set(key,url.searchParams.get(key));
  return destination.pathname+destination.search;
}
export function mediaRequest(url) {
  if (url.pathname.startsWith(prefix)) return {key:url.pathname.slice(prefix.length), original:true};
  if (!['/_image','/_private-image'].includes(url.pathname)) return;
  const href = url.searchParams.get('href');
  // Only local fingerprinted assets or explicitly authorized CMS media may be
  // transformed. Never delegate arbitrary/encoded remote URLs to a downloader.
  if (href && /^\/_astro\/[a-zA-Z0-9_.-]+$/.test(href)) return;
  let path;
  try {
    const source = new URL(href || '', url.origin);
    if (source.origin === url.origin && !source.username && !source.password) path = source.pathname;
  } catch {}
  return {key:path?.startsWith(prefix) ? path.slice(prefix.length) : '', original:false};
}
export function mediaIds(value, ids = new Set()) {
  if (Array.isArray(value)) value.forEach(child => mediaIds(child,ids));
  else if (value && typeof value === 'object') {
    if (value.id && (value.provider === 'local' || value.meta?.storageKey)) ids.add(value.id);
    if (value._type === 'image' && value.asset?._ref && (!value.asset.provider || value.asset.provider === 'local')) ids.add(value.asset._ref);
    Object.values(value).forEach(child => mediaIds(child,ids));
  }
  return ids;
}
export async function authorizeMedia({target, editor, preview, loadEntry, loadMedia}) {
  if (!target || !/^[A-Za-z0-9._-]+$/.test(target.key)) return false;
  if (editor) return true;
  if (!preview || !['posts','services','infopages','weddingtestimonials','readings','pricing'].includes(preview.collection)) return false;
  const entry = await loadEntry(preview.collection,preview.id);
  if (!entry) return false;
  const item = await loadMedia(target.key);
  return !!item && mediaIds(entry.data).has(item.id);
}
