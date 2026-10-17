# Git-authoritative published releases

Jake edits in EmDash and keeps private drafts there. The existing Withers Co Cloudflare Worker commits complete published content and referenced images to Git through the repository-only Married by Jake Publisher App. Cloudflare Builds validates and deploys the public static site from that exact Git commit. This workflow is active; the Jake-owned account move is deferred. See [publishing operations](PUBLISHING_SERVICE.md) for current configuration, evidence and rollback.

## Editing and publication

Save draft preserves the current published website. Native previews use an entry-scoped, expiring signer and private media access. Publish saves the public CMS version and queues a release. The editor banner and private `/_publishing` page distinguish preparation, building, retry/failure and confirmation. A successful CMS save is separate from a live website release.

The existing minute cron retains EmDash maintenance and runs one leased publisher. It reads native D1/R2 bindings, excludes private drafts, users and revisions, verifies referenced image bytes, and commits complete Portable Text, allowed fields, public schema and media metadata. Only `content/published/` and `src/images/published/` are managed by the App. New media uploads are bounded per tick. Atomic non-forced Git updates, persisted commit intent and lease fencing protect concurrent work.

Public loaders read only committed JSON. Public images, HTML, search, RSS and sitemap are build artifacts. The Worker serves them before EmDash/D1; unknown public routes cannot render mutable CMS data. Historical published media URLs resolve to committed image bytes. Draft-only originals and transforms remain authenticated. Future inline images and galleries retain alt text, captions, links and focal metadata.

## Build and failure gates

Only reviewed `main` source deploys through Cloudflare Builds, using Node 24.21.0, `npm ci && npm run validate`, then `npm run deploy:ci`. Exact CI/checkout SHA, clean source, current Git main, matching release manifest and an exclusive deployment lease are required. The guarded deploy preserves the owner-controlled activation switch, including an emergency pause. The App key is a runtime secret; Builds uses a separate masked deployment-lock credential.

The canonical public entry is `src/public-worker.ts`, a complete upload below 32 KiB with ASSETS and an HTTP CMS service binding only. The existing Worker retains all private resources, cron and its deferred-CMS public fallback. `scripts/build-public.mjs` checks the exact source/hash and dependency allowlist; native workerd checks every canonical plus unchanged private Requests/Responses and CMS-failure isolation. Coordinated Builds activate the backend first, then the matching public release, using a shared lease, exact version receipts and live checks/rollback. Version releases leave route/cron ownership intact. See [delivery operations](PUBLIC_DELIVERY.md) and [performance evidence](PERFORMANCE.md).

Export, media, Git conflicts and failed/stale builds leave the last healthy deployment available. Transient attempts retry with bounded backoff; conflicts and repeated failures pause for review. The publisher confirms only its exact live SHA and content hash. Retry never enables a disabled publisher or discards uncertain commit intent. Preserve current CMS edits and privately reconcile Git/CMS/live state before resuming a conflict; never force-push or reset the ledger as a shortcut.

## Verified current-account release

On 17 October, the two approved MC/cost links were published through native EmDash. The repository App created content commit `f0dbe4d96e8589ec6dcdc79d6c1664641cfe80e5`; Cloudflare automatically built/deployed it, and the editor confirmed the exact live release. Its content hash is `99e71c4554c04351bdc245663fd9f1e856b57e2fcd251773c54757f73aee2c60`. Later source releases can serve the same published snapshot; always check current `release.json` and active Worker traffic.

The snapshot has 627 published entries, including 585 reviews, with 308 referenced originals in Git. All 616 review records, 31 private review drafts and 693 original revisions are preserved; the two saved drafts and two new published revisions bring the revision total to 697. The public JSON files match a fresh native CMS export exactly. Current full validation and live evidence are recorded in the publishing runbook and [project history](PROJECT_HISTORY.md).

## Ownership and recovery

The site and publisher run on Cloudflare without an online Mac or omarchy. Josh explicitly approved temporary use of the dedicated Builds token attached to his Cloudflare login; this is the remaining credential ownership dependency until migration. Runtime GitHub access uses Jake's repository-owner App, not a personal GitHub PAT.

Do not create a new account, move resources, disconnect other integrations, upgrade plans or change DNS under this setup authorization. Any Jake-account migration needs destination ownership/details, explicit resource/integration approval, a current editing freeze/delta plan and separately approved cutover. Preserve MX/TXT records, DNSSEC/certificates, media, every draft/revision and owner recovery access. The [migration handoff](MIGRATION_HANDOFF.md) retains dated planning evidence; current operations take precedence.

Keep private current CMS backups, full database/auth recovery material, media binaries and encryption secrets outside Git. A Worker rollback restores code/assets, not D1/R2. Pause publishing and Builds before emergency rollback, retain newer CMS edits, restore the reviewed healthy version, verify it, then reconcile state before resuming. Never import the historical Markdown archive over current EmDash data.
