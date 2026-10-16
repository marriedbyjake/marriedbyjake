import type { ImageMetadata } from 'astro';
import media from '../../content/published/media.json';
const originals = import.meta.glob<{default:ImageMetadata}>('../images/published/*', {eager:true});
export function committedMedia(key: string) {
  const item = Object.values(media.items).find(item => item.sourceStorageKey === key);
  return item ? originals[`../images/published/${item.asset}`]?.default : undefined;
}
export function committedImage(id: string) {
  const item = (media.items as Record<string, typeof media.items[keyof typeof media.items]>)[id];
  const image = item && originals[`../images/published/${item.asset}`]?.default;
  if (!image) throw Error('Rich content references an image outside the committed release');
  return {item,image};
}
