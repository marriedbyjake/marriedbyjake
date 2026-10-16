# Married by Jake publishing operations — 16 October 2026

The approved target is the existing Withers Co `marriedbyjake` Worker. The Jake-owned account move is deferred. Do not move accounts, change DNS, change the existing bindings, upgrade plans or disconnect other repositories as part of this release.

## Activation state

The owner has installed **Married by Jake Publisher**, App ID `5343818`, installation `172038461`, on **only `marriedbyjake/marriedbyjake`** (repository `1104160905`). It has Contents read/write and mandatory Metadata read. Webhooks, OAuth callbacks, account permissions and other repository permissions are disabled. Its repository-scoped installation credential has authenticated successfully. The private recovery copy is outside Git.

The separately approved official **Cloudflare Workers and Pages** App is connected to this repository in the existing Withers Co account. Automatic builds are paused while configuration and release checks finish. `PUBLISHING_ENABLED=false` remains the source default. No account or DNS move has occurred. Check the current live `release.json`, active Worker version and private editor status before claiming activation; earlier handoff counts and deployment IDs are dated evidence.

## Editing and release authority

Jake edits and previews in EmDash. Save draft retains private revisions. Publish saves the public CMS version and queues a website release; it does not mean the website is already live. The admin banner and authenticated `/_publishing` page distinguish paused, pending, preparing, building, retrying and healthy states. Editors can retry a failed attempt after resolving its cause; retry cannot activate a disabled publisher. Signed previews authorize only one entry, expire, and carry private/no-store/noindex/no-referrer headers.

The existing minute cron preserves EmDash maintenance and runs the publisher. Native D1/R2 bindings read a consistent published snapshot and checksum newly referenced images. Drafts, private revisions, users and secrets never enter Git. The only managed paths are `content/published/` and `src/images/published/`. A repository-only App creates a complete Git tree and uses atomic, non-forced reference updates. Concurrent CMS changes restart preparation; independent edits to managed Git files pause instead of being overwritten.

The private `options` row `marriedbyjake:publishing` holds the lease and durable progress. At most two new images and four metadata blobs are uploaded per tick. The publisher waits for its exact Git SHA and content hash in live `release.json` before accepting the release. Transient errors back off for 60/120/240 seconds, then pause. Conflicts pause immediately; a build unconfirmed for 30 minutes also pauses. Existing healthy public assets remain available during these failures.

## Cloudflare Builds configuration

Production branch: `main`; previews disabled. Use Node `24.21.0`, locked dependencies and these commands:

- Build: `npm ci && npm run validate`
- Deploy: `npm run deploy:ci`

Build variables are `NODE_VERSION=24.21.0`, the existing `CLOUDFLARE_ACCOUNT_ID`, `PUBLISHING_DEPLOY_APPROVED=true`, and the existing restricted `PUBLIC_GOOGLE_MAPS_API_KEY`. Keep the dedicated `PUBLISHING_BUILD_SECRET` masked. Cloudflare supplies its deployment credential and `WORKERS_CI`, `WORKERS_CI_BRANCH`, `WORKERS_CI_COMMIT_SHA`; do not copy a personal token or override those source identifiers. The publisher App private key belongs only in the runtime secret `GITHUB_APP_PRIVATE_KEY`, never in Builds.

The source guard rejects missing/wrong CI identity, non-main branches, dirty source and SHA mismatches. The deploy guard checks that `dist/client/release.json` matches the checkout and committed content hash, claims the deployment lease, then checks current GitHub main before uploading. `--keep-vars` preserves runtime activation and App settings across content builds. IndexNow follows a successful deployment.

A dedicated authenticated `POST /_publishing/deployment` endpoint operates only `marriedbyjake:deployment`, a second private row in the same options table. It can claim, renew and release a five-minute lease for one commit; it cannot read or change content, media or settings. Its separate masked CI/runtime secret avoids giving Builds a D1 API credential or the publisher App key. The CI process renews every 30 seconds, aborts on lost renewal and bounds deployment to four minutes. Concurrent attempts fail closed and must retry; an old attempt cannot overwrite a newer guarded release. Unauthenticated requests expose no ledger. All normal production deployments must use this guard. Initial bootstrap and emergency rollback require pausing both automatic publishing and Builds first.

Official references: [Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/). Cloudflare's account-linking constraint must be reviewed again before any future account move; never disconnect unrelated integrations.

## Privacy and media

Public pages, search, RSS and sitemap read committed JSON and static image assets. Unknown public routes do not render mutable CMS data. Historical published original-image URLs redirect to the committed bytes; replacing an R2 object cannot change those public bytes. Draft-only originals and transform aliases require an active editor session or a valid entry-scoped signed preview. The protected transform route avoids EmDash's storage-only image fast path. Signed preview HTML propagates its token only to its CMS image requests.

Portable Text image/gallery renderers resolve committed media and preserve alt text, captions, links and focal metadata. Unsupported or missing referenced images fail the export/build, retaining the previous release. Source originals remain byte-identical. Public cards retain square corners and the established layout.

## Validation, activation and rollback

Before activation: run `npm ci` and `npm run validate` on Node 24; reconcile a fresh authenticated CMS export; verify all referenced image checksums; exercise signed previews, private originals/transforms and authenticated editor status; inspect desktop/mobile output; verify exact-SHA, stale-build, conflict, retry and restart behavior. Private backups and test evidence belong outside Git. Never import the Markdown archive over current CMS content.

For first bootstrap, leave publishing and Builds paused, commit/reconcile/push the exact intended main revision, build it cleanly and deploy that revision with `wrangler deploy --keep-vars`. Verify its full public output and private CMS before configuring runtime App values and the masked build-lock secret. Prove a guarded Cloudflare build of that exact source, then enable one publisher. Use the two approved MC/cost-page links as the real content-release proof; preserve all other wording and concurrent edits. Measure publication latency, native D1 metadata and Worker resource use before signing off.

If a release fails, leave the healthy site running, inspect `/_publishing` and the Cloudflare build, resolve the cause and retry the pending intent. Do not force-push or discard newer CMS edits. For emergency rollback, pause publishing and Builds, record current Git/live SHA and take current private CMS/media backups. Restore the selected healthy Worker/version or reviewed Git release, verify routes and image bytes, then reconcile the ledger against Git and live output before resuming. Worker rollback restores code/assets, not the database or media; never restore a stale database over newer drafts or revisions. Retain old healthy versions and private backups until the owner accepts the release.
