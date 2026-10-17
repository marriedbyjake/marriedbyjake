# Public delivery latency pilot — 17 October 2026

The remaining slow-page symptom is waiting outside recorded Worker execution. A measured 1,100 ms IAD request matched 20 ms Worker wall time/1 ms CPU; an empty 718 ms canonical redirect matched 0/0 ms. The current code evaluates only 15,884 eager bytes but still uploads an approximately 18.4 MiB CMS/application package. Smaller startup CPU did not resolve regional latency. See [measured evidence](PERFORMANCE.md).

The approved experiment tests a complete public Worker upload below 32 KiB, containing only the existing public router and an ASSETS binding. It has no Astro/EmDash runtime, Node compatibility, DB, R2, sessions, Images, cron, publisher, service binding or private secret. It now runs separately from production. Its measured improvement supports continuing the public-delivery design; it does not identify a particular Cloudflare internal cause or prove a production cutover safe.

## Prepared resource and authorization boundary

- Approved Worker: `marriedbyjake-public-pilot` in the existing Withers Co account from `wrangler.jsonc`, at `https://marriedbyjake-public-pilot.withersco.workers.dev`.
- Public endpoint only: its normal `workers.dev` hostname. `routes: []`; preview URLs disabled. No canonical-domain route or DNS change.
- ASSETS contains only the already-public `dist/client` output from an exact clean Git commit. The build verifies the full published snapshot and referenced original checksums first.
- Private paths return unavailable; the pilot cannot call the production CMS. It cannot read drafts, revisions, accounts, media storage or the publishing ledger.
- Responses are noindex/nofollow, robots.txt disallows crawling, and a restrictive response CSP blocks scripts, analytics, third-party frames, media and form submissions. HTML bytes remain unchanged. This is an HTML/asset delivery experiment, not a functioning replacement editor or a full-page JavaScript performance test.
- Josh explicitly approved this one isolated Worker and regional benchmarks on 17 October. That approval does not approve switching canonical traffic, connecting CMS services or changing the publishing integration.

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

The prepared version's complete script is 12,151 bytes. Local native checks pass all 652 current canonical URLs with identical HTML bytes and zero outbound calls. The existing full production suite also passes. The isolated deployment and its separate live/regional evidence are recorded below.

Use only the generated pilot configuration, never the production configuration. Check that its Worker name, empty routes and ASSETS-only binding still match this document before deploying. A local `wrangler deploy --dry-run --config .emdash/public-pilot/wrangler.json` verifies packaging. The approved deployment used `wrangler deploy --config .emdash/public-pilot/wrangler.json`, annotated with the exact source commit. Do not copy or broaden production secrets or Maps restrictions.

## Approved deployment and live isolation

At 15:34 Hobart on 17 October, the explicit pilot deployment uploaded 11.87 KiB JavaScript (3.02 KiB gzip); Cloudflare reported 1 ms startup. Source is `2e50a01128fa7fbe99be144742bb06793677b786`, Worker version `1c4a7698-6b4f-4ca9-8ce0-3cff48c0c382`, deployment `576f3f0b-c12d-4274-aa86-92955bfd46e0`, 100% traffic. Live `release.json` confirms that exact source and unchanged content hash `99e71c4554c04351bdc245663fd9f1e856b57e2fcd251773c54757f73aee2c60`.

Read-only Cloudflare APIs confirm ASSETS is the only binding, no cron or custom domains, no route on the canonical zone, `workers.dev` enabled and preview URLs disabled. Both canonical and `www` routes still target `marriedbyjake`. Private CMS, media, preview and publishing paths return unavailable; preview-query denial, method/HEAD handling, redirects, noindex/CSP, robots disallow and immutable image bytes pass live checks.

All 652 pilot canonical responses are HTTP 200 and byte-identical to the exact build, including pagination. Six representative production/pilot responses are also byte-identical to each other. The concurrent local MEL crawl has median 112.7 ms, p95 386.2 ms, maximum 752.5 ms; three responses exceed 500 ms. This crawl proves content parity and does not support claiming every request is fast. An earlier local attempt stopped on a DNS-resolution error; the complete rerun passed without network retries, and the original log is retained.

Production remains source `9aa6bc21963bcb87065589aaef74ad45abb76486`, Worker `d89a0af2-5d34-4315-b36c-4ce8e3c9bc42` at 100% traffic. Its content hash and public pages, blog/readings/search/RSS/sitemap and CMS sign-in redirect were checked separately. No production deployment, CMS save, credential, integration, binding, route or DNS change was made for the pilot. It is a fixed test snapshot and is not connected to automatic publishing.

## Regional measurements

Globalping reused measurement `2PDkzkraDd396zH2k00021KVW` to select the same six machines in Ashburn, Frankfurt, London, Singapore, Sydney and New York. Each request used HTTP/2, gzip and a fresh connection. Reported navigation TTFB is the sum of DNS, TCP, TLS and first-byte wait. All successful comparisons request the same six paths: home, `/weddingtestimonials/maddison-and-matthew`, `/weddingtestimonials/1808-stephanie-l`, `/serviceandprice`, `/search.json` and `/weddingtestimonials?page=2`. The worst Ahrefs review was repeated three further times with alternating target order. Cloudflare trace controls returned in 31–42 ms.

The initial six-path comparison includes 36 requests per target:

| Target | Median TTFB | p95 | Maximum | Above 500 ms |
| --- | ---: | ---: | ---: | ---: |
| Canonical production | 426.5 ms | 934 ms | 1,095 ms | 13/36 |
| Existing Worker hostname | 490 ms | 1,030 ms | 1,105 ms | 17/36 |
| Isolated pilot | 198.5 ms | 445 ms | 479 ms | 0/36 |

Including the three repeat sets gives 54 requests per target: production median 208 ms/p95 934 ms/max 1,371 ms, existing Worker 436.5/854/1,105 ms, pilot 149.5/443/479 ms. The pilot has no response above 500 ms in that sample; production has 17/54 and the existing Worker 22/54. The experiment's median below 200 ms/p95 below 500 ms goals are met for these regional samples.

A further worst-review comparison followed approximately 127–142 seconds without requesting that path from the corresponding target/probes. Pilot TTFBs were 83/75/94/149/51/75 ms; canonical production 1,092/99/50/634/51/422 ms; existing Worker 521/55/61/707/63/106 ms. Across all 60 document/search samples per target, production median/p95/max is 208/934/1,371 ms with 19 above 500 ms, existing Worker 421/850/1,105 ms with 24 above 500 ms, pilot 132.5/340/479 ms with none above 500 ms. The four repeat sets weight this aggregate towards the worst review; the initial six-path table remains the balanced comparison.

One immutable WebP was also tested on the same six machines: production median/max 642.5/1,246 ms, existing Worker 173.5/862 ms, pilot 161.5/307 ms. These six asset samples per target are excluded from the document aggregate. In total, 204 successful requests (180 documents/search, 18 image requests, six trace controls) were measured, plus the six excluded malformed pagination probes. Tests used the free anonymous Globalping quota without creating an account or purchasing credits.

Some warmed production requests are faster than the pilot: the 18 repeated worst-review samples have production median 52.5 ms versus pilot 74 ms, but production still has four samples above 500 ms and a 1,371 ms maximum. This supports improved consistency and a smaller slow tail, not a claim that every page or region is faster. Pilot asset cache state starts colder; Singapore probe traffic sometimes reaches NRT instead of SIN, even on the same machine. These small samples do not isolate platform internals, sustained load, longer idle periods or visitor networks. Scripts/forms remain intentionally blocked, so this is not a full-page or real-user Core Web Vitals result. A new Ahrefs crawl is still required before claiming its warning has cleared.

An initial pagination probe put the query string in Globalping's path field and requested a missing literal path. Its six 404s are retained in raw evidence but excluded from the comparison. Corrected probes pass `page=2` through the documented query field, return 200 on all targets, and are included above. All raw requests, results, body checks and deployment/isolation evidence remain outside Git in `../qa/performance-audit/public-pilot-20261017/`.

## Production direction if the pilot proves faster

The candidate is a small public delivery Worker with committed assets, forwarding only private CMS/image/publishing requests to the existing `marriedbyjake` Worker through a Cloudflare service binding. EmDash, its credentials, D1/R2/SESSION/IMAGES, cron and the GitHub publisher remain in the existing Worker/account. Public requests would not load the CMS package. This must be implemented and tested before any canonical route change; the pilot itself cannot replace production because its private routes and scripts are deliberately disabled.

Simply setting the current deployment to assets-first would bypass existing router behavior for matching files. Query pagination, preview-query denials, `www` handling, historical media transforms and exact publication behavior all require an explicit design. Before a production split, test native auth/CSRF/passkeys, signed preview tokens and images, cookies and Origin, canonical/historical redirects, unknown URLs, all 652 current pages, search/RSS/sitemap and Maps/forms with JavaScript enabled. Preserve the exact-commit release and deployment-lease gates, deploy compatible CMS/public artifacts in a guarded sequence, and verify that build or service failures retain the previous healthy public release. Account/resource/integration and canonical-route cutover approvals remain separate from pilot approval.

If the pilot does not improve regional delivery, retain the current production setup and use the matched request evidence for further Cloudflare diagnosis. Do not commit to a production split on the basis of bundle size alone.

Official references: [asset and Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
