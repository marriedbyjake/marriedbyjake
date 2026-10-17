# Public delivery latency pilot — 17 October 2026

The remaining slow-page symptom is waiting outside recorded Worker execution. A measured 1,100 ms IAD request matched 20 ms Worker wall time/1 ms CPU; an empty 718 ms canonical redirect matched 0/0 ms. The current code evaluates only 15,884 eager bytes but still uploads an approximately 18.4 MiB CMS/application package. Smaller startup CPU did not resolve regional latency. See [measured evidence](PERFORMANCE.md).

The next experiment tests a complete public Worker upload below 32 KiB, containing only the existing public router and an ASSETS binding. It has no Astro/EmDash runtime, Node compatibility, DB, R2, sessions, Images, cron, publisher, service binding or private secret. This can test the remaining package/dispatch hypothesis without altering the running site. It is an experiment, not a demonstrated production fix.

## Prepared resource and authorization boundary

- Proposed Worker: `marriedbyjake-public-pilot` in the existing Withers Co account from `wrangler.jsonc`.
- Public endpoint only: its normal `workers.dev` hostname. `routes: []`; preview URLs disabled. No canonical-domain route or DNS change.
- ASSETS contains only the already-public `dist/client` output from an exact clean Git commit. The build verifies the full published snapshot and referenced original checksums first.
- Private paths return unavailable; the pilot cannot call the production CMS. It cannot read drafts, revisions, accounts, media storage or the publishing ledger.
- Responses are noindex/nofollow, robots.txt disallows crawling, and a restrictive response CSP blocks scripts, analytics, third-party frames, media and form submissions. HTML bytes remain unchanged. This is an HTML/asset delivery experiment, not a functioning replacement editor or a full-page JavaScript performance test.
- No provisioning or deployment is authorized yet. Josh's earlier instruction requires specific approval before creating resources. Approval for this one isolated pilot does not approve switching canonical traffic, connecting CMS services or changing the publishing integration.

The source is `src/public-pilot-worker.ts`. It reuses `src/lib/published-routing.ts` for query pagination, historical/canonical redirects and preview denials. The full uploaded script is bundled separately; a dependency allowlist and 32 KiB complete-upload limit prevent the CMS runtime from entering it.

## Local preparation and verification

Use Node 24.21.0, locked dependencies and the existing private Maps build configuration. Commit intended local source first; neither command below pushes or deploys anything:

```sh
npm run build
npm run build:public-pilot
npm run test:public-pilot
```

Packaging refuses a dirty checkout, a stale source SHA or a different content hash. Generated artifacts stay in ignored `.emdash/public-pilot/`: one `server/worker.mjs`, public client assets, `pilot-manifest.json` and the explicit pilot `wrangler.json`. The script base directory is separate from the client assets and `find_additional_modules` is explicitly disabled; otherwise Wrangler's no-bundle default could attach the public HTML as code modules. It copies no `.dev.vars`, credentials, private backups, database or server build. Do not publish the `.emdash` directory to Git.

The native workerd integration check has only ASSETS and denies outbound requests. It requests every canonical sitemap URL, compares response bytes against its exact build file, checks query pagination and redirects, verifies private-path denial, HEAD/method handling, noindex/CSP, release identity and immutable image bytes. The ordinary production `npm run validate` remains independent of this optional experiment.

The prepared version's complete script is 12,151 bytes. Local native checks pass all 652 current canonical URLs with identical HTML bytes and zero outbound calls. The existing full production suite also passes. No resource has been created and no regional pilot measurements are available yet.

After resource approval, use only the generated pilot configuration, never the production configuration. Check that its Worker name, empty routes and ASSETS-only binding still match this document before deploying. A local `wrangler deploy --dry-run --config .emdash/public-pilot/wrangler.json` can verify packaging before approval; an actual deploy must wait for approval. Do not copy or broaden production secrets or Maps restrictions.

## Regional experiment after approval

First verify the pilot's release SHA/content hash, body checksums, private denials, disallow rules and active version. Reuse the same six Globalping machines to compare canonical production against the pilot using identical URL paths, HTTP version, encoding and connection assumptions. Test home, the worst Ahrefs review, another review, pricing, search and query pagination, including repeated requests after different idle intervals. Public HTML/asset responses can be benchmarked without rendering the intentionally blocked JavaScript. Retain the direct Cloudflare trace control and exact request IDs. Repeat enough times to distinguish rollout/cache warming and ordinary network variation from a stable improvement.

The proposed acceptance goal is median first-byte time below 200 ms and p95 below 500 ms across these regional samples, all canonical document checks successful, and no privacy/routing regressions. These are experiment targets, not a guarantee for every visitor or network. Compare the full distribution and cold/repeated requests, not only an average. Do not claim Ahrefs or real-user Core Web Vitals improved without the relevant later measurements.

## Production direction if the pilot proves faster

The candidate is a small public delivery Worker with committed assets, forwarding only private CMS/image/publishing requests to the existing `marriedbyjake` Worker through a Cloudflare service binding. EmDash, its credentials, D1/R2/SESSION/IMAGES, cron and the GitHub publisher remain in the existing Worker/account. Public requests would not load the CMS package. This must be implemented and tested before any canonical route change; the pilot itself cannot replace production because its private routes and scripts are deliberately disabled.

Simply setting the current deployment to assets-first would bypass existing router behavior for matching files. Query pagination, preview-query denials, `www` handling, historical media transforms and exact publication behavior all require an explicit design. Before a production split, test native auth/CSRF/passkeys, signed preview tokens and images, cookies and Origin, canonical/historical redirects, unknown URLs, all 652 current pages, search/RSS/sitemap and Maps/forms with JavaScript enabled. Preserve the exact-commit release and deployment-lease gates, deploy compatible CMS/public artifacts in a guarded sequence, and verify that build or service failures retain the previous healthy public release. Account/resource/integration and canonical-route cutover approvals remain separate from pilot approval.

If the pilot does not improve regional delivery, retain the current production setup and use the matched request evidence for further Cloudflare diagnosis. Do not commit to a production split on the basis of bundle size alone.

Official references: [asset and Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
