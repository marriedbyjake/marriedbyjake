/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="emdash/locals" />

declare module 'cloudflare:workers' { export const env: Cloudflare.Env; }

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type ImagesBinding = import("@cloudflare/workers-types").ImagesBinding;
declare var HTMLRewriter: typeof import('@cloudflare/workers-types').HTMLRewriter;

interface Window {
  dataLayer: any[];
}

namespace App {
  interface Locals { publishedCanonical?: string; }
}
