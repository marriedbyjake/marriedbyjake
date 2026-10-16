// This explicitly registered route avoids EmDash's storage-only /_image fast
// path. The normal request middleware resolves sessions and signed previews
// before our media guard permits the storage-backed transform.
export {GET} from '@emdash-cms/cloudflare/image-endpoint';
export const prerender=false;
