import media from '../../content/published/media.json';

// Keep the full source Portable Text in Git. The loader only adapts field names
// and resolves verified media into Astro's build-time image pipeline.
export function parsePublished(text: string) {
  const release = JSON.parse(text);
  if (release.formatVersion !== 1 || !release.entries) throw new Error('Invalid published collection');
  return Object.entries(release.entries).map(([id, entry]: [string, any]) => {
    const raw = entry.data;
    const source = raw.featured_image;
    const asset = source?.id ? (media.items as Record<string, any>)[source.id] : undefined;
    if (source?.id && !asset) throw new Error(`Published media is missing for ${id}`);
    const titleCase = (value: unknown) => typeof value === 'string'
      ? value.replace(/\w\S*/g, part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()) : undefined;
    const group = (prefix: string) => ({ title: raw[`${prefix}_title`], price: raw[`${prefix}_price`], description: raw[`${prefix}_description`] });
    return {
      ...raw, id, cmsId: entry.cmsId, updatedAt: entry.updatedAt,
      pubDate: raw.pub_date || undefined,
      ...(asset ? { image: { url: `../../src/images/published/${asset.asset}`, alt: source.alt || asset.alt || raw.title || raw.couple_name || '', focalX: source.focalX ?? asset.focalX, focalY: source.focalY ?? asset.focalY } } : {}),
      coupleName: raw.couple_name,
      location: titleCase(raw.location), venue: titleCase(raw.venue),
      featured: !!raw.featured,
      tags: raw.tags || [], youtubeUrl: raw.youtube_url || undefined,
      australianCeremonies: group('australian'), internationalCeremonies: group('international'), mc: group('mc'),
    };
  });
}
