type MapReviewEntry = {
  id?: string;
  data: {
    venue?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    coupleName?: string | null;
  };
};

export type TestimonialMapLocation = {
  lat: number;
  lon: number;
  // Compact public identifiers and names; do not repeat URL prefixes or review bodies.
  reviews: [slug: string, name: string][];
};

function reviewSlug(id: string | undefined): string | undefined {
  if (!id || !id.split("/").every((part) => /^[\p{L}\p{N}_-]+$/u.test(part))) return;
  return id.split("/").map(encodeURIComponent).join("/");
}

// Exact venue + location metadata establishes an association; coordinates alone do not.
export function testimonialMapLocations(entries: MapReviewEntry[]): Record<string, TestimonialMapLocation> {
  const groups = new Map<string, { name: string; position?: { lat: number; lon: number }; reviews: Map<string, string> }>();
  for (const { id, data } of entries) {
    const name = [data.venue, data.location].map((part) => part?.trim()).filter(Boolean).join(", ");
    if (!name) continue;
    const key = name.replace(/\s+/g, " ").toLocaleLowerCase("en-AU");
    let group = groups.get(key);
    if (!group) {
      group = { name, reviews: new Map() };
      groups.set(key, group);
    }
    const { latitude: lat, longitude: lon } = data;
    if (typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon)
        && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      // Preserve the old map's last valid coordinate selection for duplicate labels.
      group.position = { lat, lon };
    }
    const slug = reviewSlug(id);
    if (slug) group.reviews.set(slug, data.coupleName?.trim() || "Wedding review");
  }
  return Object.fromEntries([...groups.values()]
    .filter((group) => group.position)
    .map((group) => [group.name, { ...group.position!, reviews: [...group.reviews] }]));
}
