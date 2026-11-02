import {decodeHTMLStrict} from 'entities';

/** CMS/imported metadata may contain HTML entities; Astro must escape plain text. */
export function metadataText(value: string): string {
  return decodeHTMLStrict(value);
}
