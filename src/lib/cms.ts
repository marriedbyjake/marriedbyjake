import { getCollection as loadCollection, getEntry as loadEntry, type CollectionEntry } from 'astro:content';
import { extractPlainText } from 'emdash';
import type { PortableTextProps } from 'emdash/ui';
import { canonicalContentLinks } from './internal-links';

export type Collection = 'posts' | 'services' | 'weddingtestimonials' | 'readings' | 'infopages' | 'pricing' | 'website';
export type CmsEntry<C extends Collection> = CollectionEntry<C> & {
  content: PortableTextProps['value'];
  updatedAt?: Date;
};
function normalize<C extends Collection>(entry: CollectionEntry<C>): CmsEntry<C> {
  let content: PortableTextProps['value'] | undefined;
  let body: string | undefined;
  const richContent = () => content ??= canonicalContentLinks(entry.data.content);
  return {
    ...entry,
    get content() { return richContent(); },
    get body() { return body ??= extractPlainText(richContent()); },
    updatedAt: entry.data.updatedAt,
  };
}
// These entries come exclusively from validated versioned files. There is no
// runtime CMS query or mutable production data in the public rendering path.
export async function getCollection<C extends Collection>(collection: C): Promise<CmsEntry<C>[]> {
  return (await loadCollection(collection)).map((entry: CollectionEntry<C>) => normalize(entry));
}
export async function getEntry<C extends Collection>(collection: C, slug: string): Promise<CmsEntry<C> | undefined> {
  const entry = await loadEntry(collection, slug);
  return entry ? normalize(entry) : undefined;
}
