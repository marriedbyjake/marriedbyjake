/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type ImagesBinding = import("@cloudflare/workers-types").ImagesBinding;

interface Window {
  dataLayer: any[];
}
