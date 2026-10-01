import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import { extractPlainText, getEmDashCollection, getEmDashEntry, type ContentEntry } from "emdash";
import type { PortableTextProps } from "emdash/ui";

export type Collection = "posts" | "services" | "weddingtestimonials" | "readings" | "infopages" | "pricing";
export type CmsEntry<C extends Collection> = CollectionEntry<C> & {
  data: CollectionEntry<C>["data"] & { latitude?: number; longitude?: number };
  content: PortableTextProps["value"];
  updatedAt?: Date;
};

// Keep the existing public templates' field names while EmDash uses snake_case.
function normalize<C extends Collection>(entry: ContentEntry<object>, collection: C): CmsEntry<C> {
  const raw: Record<string, unknown> = { ...entry.data };
  const content = Array.isArray(raw.content) ? raw.content : [];
  const media = raw.featured_image as {
    id: string; src?: string; width?: number; height?: number; filename?: string; mimeType?: string; alt?: string; meta?: { storageKey?: string };
  } | undefined;
  const image = media?.id ? {
    url: {
      src: media.src || `/_emdash/api/media/file/${encodeURIComponent(media.meta?.storageKey || media.id)}`,
      width: media.width || 1200,
      height: media.height || 800,
      format: (media.mimeType?.split("/")[1]?.replace("jpeg", "jpg") || "jpg") as ImageMetadata["format"],
    },
    alt: media.alt || String(raw.title || raw.couple_name || ""),
  } : undefined;
  const titleCase = (value: unknown) => typeof value === "string"
    ? value.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    : undefined;
  const pricingGroup = (prefix: string) => ({
    title: raw[`${prefix}_title`], price: raw[`${prefix}_price`], description: raw[`${prefix}_description`],
  });
  return {
    id: entry.id,
    collection,
    data: {
      ...raw,
      ...(raw.pub_date ? { pubDate: new Date(String(raw.pub_date)) } : {}),
      ...(image ? { image } : {}),
      ...(collection === "posts" ? { tags: raw.tags || [], youtubeUrl: raw.youtube_url || undefined } : {}),
      ...(collection === "weddingtestimonials" ? {
        coupleName: raw.couple_name, venue: titleCase(raw.venue), location: titleCase(raw.location),
      } : {}),
      ...(collection === "pricing" ? {
        australianCeremonies: pricingGroup("australian"),
        internationalCeremonies: pricingGroup("international"),
        mc: pricingGroup("mc"),
      } : {}),
    },
    body: extractPlainText(content),
    content,
    updatedAt: raw.updatedAt ? new Date(String(raw.updatedAt)) : undefined,
  } as CmsEntry<C>;
}

export async function getCollection<C extends Collection>(collection: C): Promise<CmsEntry<C>[]> {
  const { entries, error } = await getEmDashCollection(collection, { status: "published" });
  if (error) throw new Error(`Unable to load ${collection}`, { cause: error });
  return entries.map((entry) => normalize(entry, collection));
}

export async function getEntry<C extends Collection>(collection: C, slug: string): Promise<CmsEntry<C> | undefined> {
  const { entry, error } = await getEmDashEntry(collection, slug);
  if (error) throw new Error(`Unable to load ${collection}/${slug}`, { cause: error });
  // EmDash permits an authenticated preview only for its signed preview URL.
  return entry ? normalize(entry, collection) : undefined;
}
