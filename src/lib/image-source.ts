import type {ImageMetadata} from 'astro';

// Content collection images can be local Astro metadata or external URLs.
// Metadata fields need the source string, never JavaScript's object coercion.
export function imageSource(image: string | Pick<ImageMetadata, 'src'> | null | undefined): string | undefined {
  return typeof image === 'string' ? image : image?.src;
}
