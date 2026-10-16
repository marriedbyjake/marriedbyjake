# Married by Jake publishing operations — 17 October 2026

The approved target is the existing Withers Co `marriedbyjake` Worker. The Jake-owned account move is deferred. Do not move accounts, change DNS, change the existing bindings, upgrade plans or disconnect other repositories as part of this release.

## Activation state

The owner has installed **Married by Jake Publisher**, App ID `5343818`, installation `172038461`, on **only `marriedbyjake/marriedbyjake`** (repository `1104160905`). It has Contents read/write and mandatory Metadata read. Webhooks, OAuth callbacks, account permissions and other repository permissions are disabled. Its repository-scoped installation credential has authenticated successfully. The deployed key and private recovery copy are outside Git. Two keys were generated during setup; only the second is deployed. The repository owner should revoke the unused first key in the App settings (integration key `4891141`), without replacing the deployed key.

The separately approved official **Cloudflare Workers and Pages** App is connected to this repository in the existing Withers Co account. The static public site is live in that Worker. On 17 October Josh approved temporary use of the dedicated user-owned Builds token until Jake's account migration. Automatic production builds are enabled for `main`, previews remain disabled, and hosted `PUBLISHING_DEPLOY_APPROVED=true` is saved. Guarded hosted deployments passed for `6e090cf` and `55df0b0`; the latter preserves the enabled runtime publisher. The native GitHub transport correction is live. Verify the editor-form retry correction and publisher initialization before either saved draft is published. `PUBLISHING_ENABLED=false` remains the source default. No account or DNS move has occurred. Check the current live `release.json`, active Worker version and private editor status before claiming activation; earlier handoff counts and deployment IDs are dated evidence.

## Editing and release authority

Jake edits and previews in EmDash. Save draft retains private revisions. Publish saves the public CMS version and queues a website release; it does not mean the website is already live. The admin banner and authenticated `/_publishing` page distinguish paused, pending, preparing, building, retrying and healthy states. Native Preview controls are enabled for posts, reviews, services and info pages. The banner offers **Preview saved draft** for readings and pricing using the same authenticated, CSRF-protected EmDash signer; their aggregate public URL patterns remain unchanged. Preview HTML excludes public analytics, and Worker observability redacts query strings. Editors can retry a failed attempt after resolving its cause; retry cannot activate a disabled publisher. Signed previews authorize only one entry, expire, and carry private/no-store/noindex/no-referrer headers.

The token-free `/_publishing` status document uses `Referrer-Policy: same-origin` so its native Retry form retains a verifiable Origin. Null, missing and foreign origins remain rejected. Private previews, media and status JSON retain `no-referrer`; the status page stays private/no-store/noindex and never sends its referrer to a foreign origin.

The existing minute cron preserves EmDash maintenance and runs the publisher. Native D1/R2 bindings read a consistent published snapshot and checksum newly referenced images. Drafts, private revisions, users and secrets never enter Git. The only managed paths are `content/published/` and `src/images/published/`. A repository-only App creates a complete Git tree and uses atomic, non-forced reference updates. Concurrent CMS changes restart preparation; independent edits to managed Git files pause instead of being overwritten.

The private `options` row `marriedbyjake:publishing` holds the lease and durable progress. At most two new images and four metadata blobs are uploaded per tick. The publisher waits for its exact Git SHA and content hash in live `release.json` before accepting the release. Transient errors back off for 60/120/240 seconds, then pause. Conflicts pause immediately; a build unconfirmed for 30 minutes also pauses. Existing healthy public assets remain available during these failures.

## Cloudflare Builds configuration

Production branch: `main`; previews disabled. Use Node `24.21.0`, locked dependencies and these commands:

- Build: `npm ci && npm run validate`
- Deploy: `npm run deploy:ci`

Build variables are `NODE_VERSION=24.21.0`, the existing `CLOUDFLARE_ACCOUNT_ID`, the approved `PUBLISHING_DEPLOY_APPROVED=true`, and the existing restricted `PUBLIC_GOOGLE_MAPS_API_KEY`. Keep the dedicated `PUBLISHING_BUILD_SECRET` masked. Cloudflare supplies its deployment credential and `WORKERS_CI`, `WORKERS_CI_BRANCH`, `WORKERS_CI_COMMIT_SHA`; do not copy a personal token or override those source identifiers. The publisher App private key belongs only in the runtime secret `GITHUB_APP_PRIVATE_KEY`, never in Builds.

The source guard rejects missing/wrong CI identity, non-main branches, dirty source and SHA mismatches. The deploy guard checks that `dist/client/release.json` matches the checkout and committed content hash, claims the deployment lease, then checks current GitHub main before uploading. The CI deploy command removes only `PUBLISHING_ENABLED` from the generated deployment configuration, then uses `--keep-vars` so the current owner-controlled activation or pause survives atomically. A value still present in Wrangler configuration would overwrite the remote value despite `--keep-vars`; the reviewed source default stays `false` for bootstrap. Other nonsecret App settings remain controlled by Git, and Cloudflare retains the runtime secrets. IndexNow follows a successful deployment.

A dedicated authenticated `POST /_publishing/deployment` endpoint operates only `marriedbyjake:deployment`, a second private row in the same options table. It can claim, renew and release a five-minute lease for one commit; it cannot read or change content, media or settings. Its separate masked CI/runtime secret avoids giving Builds a D1 API credential or the publisher App key. The CI process renews every 30 seconds, aborts on lost renewal and bounds deployment to four minutes. Concurrent attempts fail closed and must retry; an old attempt cannot overwrite a newer guarded release. Unauthenticated requests expose no ledger. All normal production deployments must use this guard. Initial bootstrap and emergency rollback require pausing both automatic publishing and Builds first.

Cloudflare currently supports only user-owned Builds deployment tokens. The generated token for this existing-account connection is tied to Josh's Cloudflare login; it is a dedicated hosted-build credential, but it does not establish independence from his account. Josh explicitly accepted this interim use on 17 October. Replacing it with Jake-owned credentials remains part of the deferred ownership migration. No personal GitHub PAT is used.

Official references: [Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/). Cloudflare's account-linking constraint must be reviewed again before any future account move; never disconnect unrelated integrations.

## Privacy and media

Public pages, search, RSS and sitemap read committed JSON and static image assets. Unknown public routes do not render mutable CMS data. Historical published original-image URLs redirect to the committed bytes; replacing an R2 object cannot change those public bytes. Draft-only originals and transform aliases require an active editor session or a valid entry-scoped signed preview. The protected transform route avoids EmDash's storage-only image fast path. Signed preview HTML propagates its token only to its CMS image requests.

Portable Text image/gallery renderers resolve committed media and preserve alt text, captions, links and focal metadata. Unsupported or missing referenced images fail the export/build, retaining the previous release. Source originals remain byte-identical. Public cards retain square corners and the established layout.

## Validation, activation and rollback

Before activation: run `npm ci` and `npm run validate` on Node 24; reconcile a fresh authenticated CMS export; verify all referenced image checksums; exercise signed previews, private originals/transforms and authenticated editor status; inspect desktop/mobile output; verify exact-SHA, stale-build, conflict, retry and restart behavior. Private backups and test evidence belong outside Git. Never import the Markdown archive over current CMS content.

For first bootstrap, leave publishing and Builds paused, commit/reconcile/push the exact intended main revision, build it cleanly and deploy that revision with `wrangler deploy --keep-vars`. Verify its full public output and private CMS before configuring runtime App values and the masked build-lock secret. Prove a guarded Cloudflare build of that exact source, then enable one publisher. Both approved MC/cost-page edits are saved as private drafts; published content is unchanged. Publish those drafts as the real content-release proof; preserve all other wording and concurrent edits. Measure publication latency, native D1 metadata and Worker resource use before signing off.

If a release fails, leave the healthy site running, inspect `/_publishing` and the Cloudflare build, resolve the cause and retry the pending intent. Do not force-push or discard newer CMS edits. For emergency rollback, pause publishing and Builds, record current Git/live SHA and take current private CMS/media backups. Restore the selected healthy Worker/version or reviewed Git release, verify routes and image bytes, then reconcile the ledger against Git and live output before resuming. Worker rollback restores code/assets, not the database or media; never restore a stale database over newer drafts or revisions. Retain old healthy versions and private backups until the owner accepts the release.


## Continuation evidence and remaining activation

The final local suite passes on Node 24.21.0: existing content checks, 39 publishing tests, four native D1/R2 controller tests, zero Astro diagnostics, 614 exact search targets, 22 RSS items, 652 sitemap canonicals, 585 review files and 24 pagination assets. Live checks passed those 652 URLs, search interaction, Maps rendering, desktop/mobile containment, CMS sign-in, original-image SHA256 and a real 640×640 WebP through a historical transform URL.

A real saved MC draft opens through EmDash’s signer. HTTP checks verify private/no-store/no-referrer HTML and CMS media, no analytics in the preview, wrong-entry/tampered-token rejection, and an unchanged public page with its normal analytics. All 693 original revision records, all 616 review records including 31 drafts, and all 308 media records compare unchanged against the pre-edit export. The two approved drafts bring the revision total to 695; native editor hydration adds only empty optional media metadata. Published content remains hash `3158d456870422bb250fc299720e3d252dd6bfb477dcc7cae59013a2ed2e2e81`.

Private evidence is in `../qa/performance-audit/continuation-*.json` and validation logs; current preservation backup is `../qa/private-backups/continuation-drafts-and-preview-settings-20261016.json`. Private preview URLs/HTML and all keys stay outside Git. The source checkout remains the requested `wip/jake-account-publishing` branch, with GitHub under the separate `github` remote; `origin` remains omarchy.

Still required: verify native editor-form retry; confirm publisher initialization; publish the two saved drafts; verify Git commit, hosted build, live exact SHA/hash, confirmation latency, native D1 metrics and Worker CPU. The future Jake-account move, owner recovery configuration and DNS cutover remain separate approvals.
