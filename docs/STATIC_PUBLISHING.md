# Git-authoritative published releases

> Updated decision, 16 October 2026: Josh deferred the account move and authorized completing the static publishing workflow in the existing Withers Co `marriedbyjake` Worker. The repository-owner publisher App and separate Cloudflare GitHub connection have been approved and installed. See [current publishing operations](PUBLISHING_SERVICE.md) for the current activation state and release procedure. The earlier account-migration plan below remains dated evidence; no new account or DNS move is authorized.

Josh accepted this workflow on 16 October 2026: private drafts stay in EmDash, complete published content is committed to Git, and public static pages build from that exact commit. Failed exports, conflicts and builds retain the last healthy public deployment. The familiar CMS remains the editing surface; the historical Markdown archive is not imported over current CMS data.

## Current state

Current-account activation is paused while Josh prepares a Jake-owned account. The move is being planned; no account/resource creation or DNS cutover has been authorized. See [the handoff](MIGRATION_HANDOFF.md).

Implementation is local and uncommitted. Production remains the private SSR source `d75698d`; no static cutover, Cloudflare Builds connection, deploy hook or publishing service has been enabled.

The lossless exporter preserves Portable Text, public collection fields, publication dates and referenced media metadata. It filters drafts, Trash, private settings, credentials and revision payloads before public Git output. Media originals are checksum-verified and content-addressed. The current reviewed snapshot has 627 published entries, including 585 reviews, and 308 referenced images. Full current CMS backups remain private outside Git.

Public collection loaders read only `content/published/*.json`; image transforms build from `src/images/published/`. Public HTML, search, RSS and sitemap are static artifacts. The custom Worker preserves canonical/historical redirects and query pagination, then serves assets before EmDash or D1. Unknown public URLs do not fall back to mutable CMS rendering. CMS/admin/image and signed preview routes remain dynamic and private.

Astro excludes underscore-prefixed filesystem routes, so internal pagination and signed preview paths are explicitly registered. File-format output also requires stripping implementation `.html` paths from public canonicals. Mandatory post-build verification now checks every sitemap URL against generated HTML and its exact canonical.

The latest local build passes: 652 sitemap URLs, 585 review HTML files, 24 pagination assets and registered private previews. The source-commit field is deliberately null for this uncommitted build; it must not be represented as a deployable build of `d75698d`. Thirty publishing tests, four isolated Cloudflare-runtime controller tests, the existing content suite and Astro diagnostics pass. These are local checks, not proof of production publishing or a complete signed-preview/browser rehearsal.

## Publishing queue and approval

Josh requested Cloudflare-native publishing so the site can operate without his machines. The uninstalled omarchy/systemd proposal is superseded and its runtime files have been removed. The adapter now uses the existing Worker cron, a conditionally leased private D1 options row and native D1/R2 bindings. No new Worker, queue, Durable Object or database is proposed. Existing EmDash scheduled work is preserved.

A repository-owner-managed GitHub App, installed only on this repository with Contents read/write and mandatory Metadata read, requires explicit owner approval and secure private-key handoff. No personal machine credential is used by the runtime. See [the exact Cloudflare setup and ownership proposal](PUBLISHING_SERVICE.md). Publishing is disabled by default; no credentials, cloud resources, ledger row or deployed queue have been created.

## Remaining cutover work

- Reconcile CMS changes since the private backup using an authenticated supported export. Native D1/R2 controller tests now cover publication, restart recovery, unpublish and Git/CMS races; the fresh production CLI read was denied with authentication error 10000.
- Complete editor-visible pending/failure status, signed preview authorization and desktop/mobile checks. Review draft-only media access: the installed CMS file handler does not itself filter storage keys by publication status.
- Confirm supported Portable Text image rendering uses committed assets and preserves focal metadata for future inline image blocks; current published content contains text/link blocks only.
- Configure Cloudflare Builds with Node 24 and required build values, fail closed while incomplete, and prove failed/stale builds cannot replace a healthy release.
- Rehearse publication, republish, removals, conflict/retry and failure handling; measure real publication latency.
- Finish the two approved contextual links through the completed workflow, then validate all public routes, image bytes, canonical redirects, sitemap, search, RSS and CMS access before release.

Do not deploy this incomplete implementation. Complete backups and normal private CMS editing remain intact. No production service, DNS, redirect configuration, CMS schema or account has been changed by this migration work.
