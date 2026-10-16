# Cloudflare publishing: owner setup and activation proposal

Prepared 16 October 2026. Current-account activation is paused while Josh creates a Jake-owned Cloudflare account. The account move is a planning decision, not authorization to create resources, change DNS or deploy. This supersedes the uninstalled omarchy/systemd proposal. All implementation remains local and inactive. See MIGRATION_HANDOFF.md for the latest checkpoint and continuation instructions.

## Concrete architecture

The **existing `marriedbyjake` Worker** keeps EmDash, private previews and its existing once-per-minute scheduled handler. That handler also checks a persistent publishing ledger in **one private row of the existing D1 `options` table**, named `marriedbyjake:publishing`. There is no new Worker, Durable Object, Queue, Workflow, database, bucket, host or public webhook endpoint.

Conditional D1 writes claim a five-minute lease, save progress before external effects and reject expired writers. A lightweight published-state fingerprint detects publish/republish, unpublish/Trash, media and declared shared-input changes, including changes missed by deferred CMS hooks. Draft-only entries/revision payloads are excluded. A complete read snapshot is taken only when needed; public page requests never invoke this queue or query D1.

The existing R2 binding supplies newly referenced images. Checksums are verified before uploading only published assets to Git. Already verified content-addressed Git blobs are reused; each tick handles at most two new images to bound memory and requests. The publisher never retains the whole media backup in Worker memory.

The GitHub App uploads a complete release tree and commit. GitHub GraphQL `updateRefs` uses the exact `beforeOid`, the new commit and `force:false`, so concurrent Git changes reject the update. Independent changes anywhere in the managed Git files are detected by a tree fingerprint, including edits made without updating the release manifest. Source files outside `content/published/` and `src/images/published/` are never changed by the publisher.

A normal Git push triggers **Cloudflare Builds**. Production output reads only that Git commit. The intended CI setup validates `WORKERS_CI_COMMIT_SHA` against the checkout and records the exact source SHA/content hash in `release.json`. A branch deploy hook alone cannot pin a commit and is not used as the publication mechanism. No runtime Cloudflare API write token is proposed. Stale/concurrent build behavior still needs rehearsal before activation.

The ledger waits for that exact source commit/content hash to become live before queuing another release. Transient errors retry after 60/120/240 seconds, then pause. Conflicts pause immediately; an unconfirmed build pauses after 30 minutes. Retrying preserves uncertain commit intent. Export/build failures retain the last healthy deployment. Draft edits remain in EmDash and are never overwritten from Git.

## Exact new credential setup requiring owner approval

Verified repository metadata: **`marriedbyjake/marriedbyjake`**, public, repository ID **1104160905**, owned by the GitHub **user account `marriedbyjake`**, not an organization. The current engineering identity can push but has no repository administration permission. The account owner must perform or explicitly authorize App creation/installation; the login does not itself prove which human controls it.

Proposed private GitHub App: **Married by Jake Publisher**, owned by the repository owner's account, with installation limited to that account and **only this repository**. Homepage: `https://marriedbyjake.com`. Disable webhooks; request no OAuth callback, organization/account permissions, Actions, Workflows, Administration or Checks access. Required repository permission: **Contents read/write**, plus GitHub's mandatory **Metadata read**.

The App credential grants Contents access throughout this one repository; runtime code further restricts changed paths. It is not a path-restricted credential. Native repository rules remain in force. If branch protection rejects the App, pause and ask the owner to choose an approved publishing policy; do not silently bypass it.

The owner generates a private key and supplies it through a secure Worker secret handoff as **`GITHUB_APP_PRIVATE_KEY`**. Never paste it into chat, put it in Git/build settings/output, or copy personal GitHub/Cloudflare authentication. Keep the owner's recovery copy in their password manager. The non-secret App ID and installation ID become `GITHUB_APP_ID` and `GITHUB_INSTALLATION_ID`; `GITHUB_REPOSITORY_ID` is already known. Runtime JWTs mint approximately one-hour installation tokens explicitly narrowed to this repository and Contents write; tokens stay in memory and are never stored in D1.

Approve this App/secret setup separately from deployment-hook approval. Activation also requires approving private ledger writes in the existing D1 database and enabling the tested publisher after all cutover checks pass. No credential has been created, requested through a personal token, or installed.

## Resource and billing footprint

No new fixed infrastructure resource or subscription is proposed. Existing Worker CPU, D1 reads/writes, R2 reads and Cloudflare build minutes are metered under the account's current plan. Minute reconciliation is about **43,200 checks per 30-day month**. The present fingerprint visits roughly 627 published entry rows plus 308 media rows per check, approximately **1.35 million rows/day before query-plan overhead**, plus native CMS maintenance and release work. Measure actual D1 metadata/CPU before activation rather than treating this estimate as a bill.

No images or Git write requests are needed for unchanged published content. Actual publications add bounded checksum work, Git API requests and a static build. Builds currently include 3,000 minutes/month on Free and 6,000 on paid plans, with paid excess at $0.005/minute. Allowance is account-wide; current account usage and CPU suitability still require verification. No plan upgrade, payment commitment or spend setting will be changed without approval.

References: [GitHub atomic ref updates](https://docs.github.com/en/graphql/reference/git#updaterefs), [scoped installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app), [Cloudflare Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Builds limits and pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).

## Ownership and eventual Cloudflare account migration

Do not move accounts now. The design has no runtime dependency on Josh's Mac, omarchy, personal credential helper or an expiring personal PAT. Jake/the repository owner should control the GitHub App, recovery key, Cloudflare account membership and billing.

For a later move, stop the old publisher first; privately back up current D1, R2 and the ledger, and preserve `EMDASH_ENCRYPTION_KEY`. Recreate the Worker, D1, private R2, session KV, Images binding and cron in the destination account; resource IDs/bindings and route/zone configuration change. Transfer data and verify authentication, previews, images, schedules and static output before routing traffic. Re-provision secrets securely and rotate/remove the old App key after cutover. Reconcile the restored ledger against current Git/live SHA before enabling one publisher.

Reconnect Cloudflare Builds and its deploy credentials in an explicit integration cutover. Cloudflare documents a one-GitHub-account-to-one-Cloudflare-account constraint; do not promise simultaneous Builds integrations in both accounts. Domain/zone movement and Google Maps domain restrictions are separate reviewed steps. Git history remains the public release authority; private backups and drafts do not become public during migration.

## Current evidence and activation gates

Thirty publishing tests and four isolated Cloudflare-runtime controller tests pass, including real isolated Git push races, App JWT/repository-scope checks, atomic reference conflicts and actual SQLite lease/recovery tests. Astro diagnostics report zero errors/warnings/hints. The complete local validation, including the latest adapter changes, verifies all 652 sitemap URLs/canonicals, 585 review files and 24 pagination assets. Native runtime tests caught and fixed a D1 compound-SELECT limit that local Node SQLite did not expose.

A separate public-reference audit confirms all 308 exported images have at least one published owner, with no missing or unreferenced exports. That is independent of the complete 308-image private backup. No private draft-only content/image has been pushed by this work.

Still required: full signed-preview HTTP integration and editor-visible status and retry, signed preview/browser and draft-only media protection checks, a fresh CMS reconciliation, Builds configuration and exact-SHA/stale-build rehearsal, secure App/key setup, measured latency/resource use, and completion of the two approved links through the new workflow. Keep `PUBLISHING_ENABLED=false` until these gates pass. Do not deploy unfinished code.
