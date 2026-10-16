import manifest from '../../content/published/manifest.json';
import type { APIRoute } from 'astro';
export const GET: APIRoute = () => Response.json({ contentHash: manifest.contentHash, sourceCommit: import.meta.env.PUBLISHED_SOURCE_COMMIT });
