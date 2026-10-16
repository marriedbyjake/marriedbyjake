# Married by Jake: account migration and publishing handoff — 16 October 2026

> Current decision, 17 October 2026: the account move is deferred. Git publishing is operational in the existing Withers Co `marriedbyjake` Worker, including the owner-installed repository App, approved interim Cloudflare Builds token, active main-branch Builds and confirmed native CMS content release. Read [current publishing operations](PUBLISHING_SERVICE.md), [static publishing](STATIC_PUBLISHING.md) and [the current handoff prompt](CODEX_HANDOFF_PROMPT.md). Everything below is the dated 16 October migration checkpoint, not the current deployment or activation state. No new account or DNS move is authorized.

Continue from the tested local checkpoint below. Prefer completing the publishing workflow in a Jake-owned Cloudflare account while the existing site remains live, then perform a separately approved, verified cutover. Josh is creating the account himself. His planning questions do **not** authorize resource creation, paid upgrades, integration activation, account movement or DNS changes.

## Open this checkout in the new Codex thread

- Workspace: `/Users/joshuawithers/Documents/Codex/2026-10-16/task/marriedbyjake`.
- Local branch: `wip/jake-account-publishing`.
- Implementation checkpoint: `82d28e07f68e946b8c7b0da6abf5183e3a4ddb39`.
- Base/live-source checkpoint: `d75698dab1b629b664ccc0fb138177fc65feb226`.
- This document and `CODEX_HANDOFF_PROMPT.md` are added after the implementation checkpoint. Check `git status` and `git log -2` for the final documentation commit and any later work.
- Nothing from this migration branch has been pushed. No remote branch was created; automatic branch-deployment behavior has not been established.
- `origin` points to the **omarchy checkout**, not GitHub. The GitHub repository is `https://github.com/marriedbyjake/marriedbyjake.git`. Inspect/reconcile the correct remote before any future release.
- Do not switch to the older `/Users/joshuawithers/Websites/marriedbyjake` checkout; it was left untouched.

The connected execution task is titled **Improve Jake review discovery**, ID `01a1427e-8b77-736c-8da8-c2d87197e0da`; Josh cannot see it in his Codex UI. Use the supplied prompt in a new Codex thread targeting the exact folder above. No task was created or conversation transferred automatically. Work history and Codex history are separate, and conversation sync does not copy this folder to another computer. [Official local-project guidance](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases).

## What is already live

The last verified release is source `d75698d`, Worker version `42b42b37-719e-4e4f-884b-b11f8672b05d` at 100% traffic, deployed 16 October 2026 at 07:40 UTC. This migration work has not changed it; recheck current status before releasing.

That release includes contextual review excerpts with genuine location/service matches, numbered directory pagination and its sitemap URLs, compact venue popups linking to full reviews, shared CMS pricing references, lazy rich-text normalization, compatible dependency updates and corrected responsive CMS image transforms. Existing public HTML remains private/no-store SSR. No shared HTML cache was added. The blog fee phrase was linked through the CMS without changing its words.

The original Ahrefs findings do not prove all 179 reported orphan URLs are broken. Preserve the directory payload reduction and existing redirects; do not reopen unrelated redirect or CMS handover work.

## What the local checkpoint implements

| Area | Files / behavior |
| --- | --- |
| Published Git snapshot | Nine files under `content/published/`: six collections, media, shared inputs and checksummed manifest. Full Portable Text and allowed public fields are preserved. Snapshot: 627 published entries, including 585 reviews. |
| Published media | 308 content-addressed originals under `src/images/published/`, approximately 56.5 MB. Every exported image has a published reference; no draft-only or unreferenced export was found. |
| Static rendering | `src/content.config.ts`, `src/lib/cms.ts`, `published-loader.ts`, shared page components and static routes read Git data. `cms-live.ts` is reserved for private previews. |
| Routing | `src/lib/published-routing.ts` and `src/worker.ts` serve public assets before EmDash/D1. Explicitly registered internal pagination and private preview routes; clean public canonicals despite `.html` build files. |
| Export/build checks | `scripts/export-published.mjs`, `verify-published.mjs`, `verify-static-build.mjs`, and `scripts/lib/`. Complete inventory, checksums, stale assets and every sitemap canonical are checked. |
| Cloudflare publisher | `src/publishing/`: repository-only GitHub App client, atomic `beforeOid` Git update, D1 conditional leases, durable commit intent, media cache, bounded upload batches, retry/pause states and live commit/hash confirmation. Existing CMS scheduled handler is preserved. |
| Tests | `scripts/tests/` and isolated workerd/D1/R2 tests in `scripts/integration/`. External APIs are mocked and all data/keys are synthetic. Test tools are pinned in the lockfile. |

The publisher is **disabled** in `wrangler.jsonc`. It proposes no new Worker, Queue, Durable Object, database, bucket or host. Its ledger would use one private row of the existing D1 options table; no production ledger row has been created. Runtime uses native D1/R2 bindings, not personal CLI credentials. No GitHub App/key, Builds connection or deploy hook has been created. The uninstalled omarchy service proposal was removed.

The implementation commit changes 365 files: nine published JSON files, 308 verified images and 48 source/test/documentation files. It contains no generated `.astro` changes, environment files or private backups. Inspect the diff against the base before continuing.

## Verification and remaining defects

`npm run validate` passed with Node **24.21.0**: existing content suite; **30 publishing tests**; **four native Cloudflare-runtime controller tests**; Astro diagnostics with **zero errors/warnings/hints**; static build checking **652 sitemap URLs and exact canonicals**, **585 review HTML files**, **24 older directory pages**, and private preview registration. It generated 1,821 image variants. An isolated lockfile `npm ci --dry-run --offline` also passed. Normal existing large-chunk advisories remain.

Native tests verify restart recovery, Git/CMS race rejection, draft-only media exclusion, publication and image removal on unpublish. They caught and fixed a D1 compound-SELECT limit missed by Node SQLite. An audit compared every exported field and complete Portable Text against the private backup: all 627 published entries match. No credential patterns or private files were found in the changed-file audit.

**Not complete; do not deploy this checkpoint:**

1. The installed CMS media-file handler does not itself filter storage keys by publication status. HTTP protection for draft-only media and image-transform bypasses remains to implement/test. Synthetic exporter exclusion is not proof of HTTP privacy.
2. Signed preview route registration and token-scope guards exist, but full EmDash signing/expiry/wrong-entry HTTP tests and desktop/mobile browser checks remain. Future Portable Text inline images and focal metadata need a committed-asset renderer or safe failure behavior; current published rich text contains text/link blocks only.
3. Editor-visible pending/failure/retry status is not implemented. Native Publish UI must not falsely imply that a queued Git release is already live.
4. Exact-SHA Builds validation, stale/concurrent build prevention, real App/branch-rule access, publication latency, CPU/D1 usage and failure rehearsal remain. `release.json` from the last uncommitted local build correctly reports `sourceCommit:null`; do not present it as the deployed source.
5. Fresh CMS reconciliation is required. A read-only production D1 CLI attempt returned authentication error **10000**. Do not expand personal credentials to work around it; use an authenticated supported CMS export or properly approved account access. Native runtime bindings avoid that CLI dependency.
6. Two approved CMS links remain **unedited**: link existing **both celebrant and MC** on the MC page to `/services`; on the cost page add the approved closing sentence **Explore my wedding services to find the right fit for your day.**, linking **wedding services** to `/services`, before the coffee footnote. Complete these as a real publishing-workflow proof once that workflow is ready. Preserve all other words and concurrent CMS edits. Do not invent GST/travel terms; the existing wording conflict still needs an owner decision.

Local evidence is outside the repository at `../qa/performance-audit/`: `static-validation.log`, `publishing-runtime-tests.log`, `checkpoint-privacy-audit.json`, `public-media-reference-audit.json`, `handoff-backup-checksums.json` and `handoff-changed-files.txt`. These are supporting evidence, not new production verification.

## Private recovery material

Mac folder: `/Users/joshuawithers/Documents/Codex/2026-10-16/task/qa/private-backups` (directory 700; files 600). Host copies remain under `/home/joshuawithers/Projects/marriedbyjake/marriedbyjake/.emdash/private-backups`. Never add either to Git or build output.

| Backup | Verification |
| --- | --- |
| `d1-20261016.sql` | 4,502,429 bytes; SHA256 `fefe440cde154c1b77b17225a9e654d001b93c8c338edd90912ce40f976b2d48`. Restored privately to SQLite: integrity OK, zero foreign-key issues; 616 reviews (585 published/31 drafts), 693 revisions, 308 media records and two users. |
| `media-backup.tar` | 56,924,160 bytes; SHA256 `2562047b2db19848b6c34af401a378d8af089cf3102bb9c9e34f0128be42aa2f`. All 308 binaries verified: 307 SHA256 and one legacy prefixed SHA1. An initial checksum-format false alarm was corrected; there was no corrupt object. |
| `emdash-backup-2026-10-16T08-16-05-e97f629c.json` | Native export, 3,364,161 bytes; SHA256 `a4c66fd6f0bfec25f227bf0f952d08f91eaaab2b082964b49bce8c11e70b6331`. Includes drafts/revisions/settings/media metadata, but excludes authentication and media binaries. It is not a replacement for the SQL/R2 backups. |

These are dated checkpoints, not a final migration delta. Verify recoverability of the existing `EMDASH_ENCRYPTION_KEY` through the owner's secure records before migration; it cannot simply be read back from Cloudflare secrets. Preserve required setup/auth configuration. A Worker rollback restores code, not database/media state. Archived Markdown is older than CMS edits and must never overwrite production.

## Owner setup and staged migration

1. **Confirm ownership and approval.** Josh creates Jake's account; record the destination account ID, owner recovery/billing arrangements and explicitly approved engineering access. Confirm GitHub owner-account access. Current repository owner is GitHub user `marriedbyjake`, repository ID `1104160905`; current engineering access has push but no admin. No account/resource creation or move is authorized by this handoff.
2. **Finish independent code and privacy gates.** Keep publishing disabled. Use synthetic/local data first. Do not expose real private data on an unprotected preview hostname. Reconcile fresh CMS data before any release; preserve authoring until an agreed final editing freeze.
3. **Prepare destination resources after approval.** Recreate Worker, D1, private R2, session KV, Images binding and existing CMS cron with new account/resource IDs. Privately restore and verify current SQL/media; provision required secrets securely. Retain users/passkeys, but expect session reauthentication. Never loosen passkey origins for staging. Inventory Stream hero video, Maps configuration and Studio Ninja form ownership too; a Worker move does not transfer those services.
4. **Owner-controlled publishing setup.** Use the private GitHub App described in `PUBLISHING_SERVICE.md`, installed only on this repository, Contents read/write plus mandatory Metadata read. Private key goes directly into the destination Worker secret; never chat/Git/build outputs. Runtime installation tokens are short-lived and repo-scoped. No personal-machine credential is forwarded. Confirm branch rules without silently bypassing them.
5. **Builds integration and proof.** Configure Node 24, locked installs, full validation and exact `WORKERS_CI_COMMIT_SHA` checks. Provision the existing Maps build value securely. A branch deploy hook alone does not pin a commit. Verify Cloudflare's one-GitHub-account-to-one-Cloudflare-account integration constraint before connecting; do not disconnect unrelated Withers Co integrations. Prove publish/republish/removal, private drafts/media, conflicts, retry/restart, stale/failed builds and exact live SHA/hash before routing traffic.
6. **Separately approved cutover.** Take final current backups and agree on an editing freeze/delta sync. Export current DNS/routes/settings and preserve Google Workspace MX/TXT records. Domain/zone ownership, registrar access, DNSSEC and certificate issuance need an explicit plan; moving a Worker alone does not move the domain. Obtain approval before DNS/routes, paid services, integration activation or any account move.

Acceptance requires matching content/media inventories, complete HTML/search/RSS/sitemap, correct canonicals and historical redirects, actual responsive image bytes, form/video/map smoke tests, private signed previews and draft media, independent owner login/recovery, exactly one publisher, measured publish latency and verified rollback. Do not claim all Ahrefs orphan reports are resolved without its actual URL export/settings.

Keep old resources and private backups until the owner accepts the destination and a retention plan. If staging fails, leave the current site untouched. For post-cutover rollback, pause publishing/editing, use the recorded current routing/certificate plan to restore the healthy endpoint where viable, and reconcile any new-account CMS edits before restoring older data. Do not promise instant DNS reversal or overwrite new edits with a stale database.

Official references: [domain/account migration and certificates](https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/), [Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), [Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/). Recheck current guidance during execution.
