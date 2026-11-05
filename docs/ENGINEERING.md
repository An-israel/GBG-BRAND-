# Production engineering checklist (all 111 items)

This is a Shopify build: Shopify runs the servers, checkout, database, CDN and security, so most
infrastructure items are **PLATFORM** or **NOT NEEDED**. Each is still accounted for.
We deliberately add no infrastructure the shop does not need – it would only add cost and fragility.

**Totals:** 51 BUILD · 29 PLATFORM · 31 NOT NEEDED

| # | Item | Status | Where it lives | Notes |
|---|---|---|---|---|
| 1 | Rate limiting | **BUILD** | scripts/lib/shopify.ts | Reads GraphQL throttleStatus and waits before the cost bucket runs dry; honours Retry-After. |
| 2 | Caching | **BUILD** | theme snippets; scripts/import-products.ts | Responsive srcset/sizes on every image; importer caches location, publication and shipping-profile IDs once per run. |
| 3 | Load balancing | **PLATFORM** | Shopify | Shopify storefront and checkout are load-balanced by Shopify. |
| 4 | Reverse proxies | **PLATFORM** | Shopify / Cloudflare | Shopify fronts all traffic with its edge network. |
| 5 | API gateways | **PLATFORM** | Shopify Admin API | Admin API is Shopify's gateway; scripts only talk to it. |
| 6 | CI/CD | **BUILD** | .github/workflows/ci.yml | Theme Check, types, unit tests, Playwright, Lighthouse CI; deploys only to the unpublished preview theme. Live theme is published by hand after sign-off. |
| 7 | Docker | **BUILD** | .devcontainer/devcontainer.json | Optional devcontainer (Node 22 + Shopify CLI + Playwright) so scripts run the same everywhere. |
| 8 | Kubernetes | **NOT NEEDED** | – | No servers to orchestrate: Shopify hosts everything. |
| 9 | Service discovery | **NOT NEEDED** | – | Only one service (Shopify); nothing to discover. |
| 10 | Circuit breakers | **NOT NEEDED** | – | Scripts are short-lived batch jobs; retry + exponential backoff (#12, #13) is enough. |
| 11 | Timeouts | **BUILD** | scripts/lib/shopify.ts; theme.js | AbortController timeout on every Admin API call (30 s), image upload (60 s) and storefront fetch (10 s). |
| 12 | Retries | **BUILD** | scripts/lib/shopify.ts | Up to 5 retries on 429, 5xx, THROTTLED, timeouts and network errors. Unit tested. |
| 13 | Exponential backoff | **BUILD** | scripts/lib/shopify.ts | backoffDelay(): base × 2^attempt + jitter, capped at 30 s. Unit tested. |
| 14 | Idempotency | **BUILD** | scripts/import-products.ts, setup-store.ts | Import keyed by SKU (update, never duplicate); setup skips anything that already exists. |
| 15 | Message queues | **NOT NEEDED** | – | No asynchronous back-end work at launch. |
| 16 | Pub/sub | **NOT NEEDED** | – | Theme publishes analytics events through Shopify's own Web Pixels bus only. |
| 17 | Event-driven architecture | **NOT NEEDED** | – | Not needed for a single-store catalogue. |
| 18 | Distributed transactions | **NOT NEEDED** | – | Checkout and inventory are atomic inside Shopify. |
| 19 | Saga pattern | **NOT NEEDED** | – | No multi-service workflows. |
| 20 | Dead letter queues | **BUILD** | scripts/import-products.ts | Rows that fail go to failed_rows.csv with a plain-English reason; fix and re-run. |
| 21 | Cron jobs | **BUILD** | .github/workflows/weekly.yml; scripts/weekly-report.ts | Weekly report: sold-out items still featured, missing condition / alt text, New Arrival tags > 30 days. |
| 22 | WebSockets | **NOT NEEDED** | – | No real-time features. |
| 23 | Long polling | **NOT NEEDED** | – | No real-time features. |
| 24 | Server-sent events | **NOT NEEDED** | – | No real-time features. |
| 25 | Database indexing | **BUILD** | scripts/setup-store.ts | Metafields (condition, collection_only) are filterable for Search & Discovery; consistent category tags. |
| 26 | Query optimization | **BUILD** | theme sections | Collections paginated (24 per load); no loops over all products; recommendations loaded lazily. |
| 27 | N+1 queries | **BUILD** | theme + scripts | No per-item lookups inside loops: shared IDs cached, collection checks use products_count. |
| 28 | Connection pooling | **PLATFORM** | Shopify | Managed by Shopify. |
| 29 | Read replicas | **NOT NEEDED** | – | No database of our own. |
| 30 | Sharding | **NOT NEEDED** | – | Shopify shards internally; nothing to do. |
| 31 | Partitioning | **NOT NEEDED** | – | No database of our own. |
| 32 | Replication | **PLATFORM** | Shopify | Shopify replicates store data. |
| 33 | Leader election | **NOT NEEDED** | – | No clustered services. |
| 34 | CAP theorem | **NOT NEEDED** | – | Shopify treats inventory as strongly consistent at checkout; an item with 0 stock cannot be bought (inventoryPolicy DENY). |
| 35 | Eventual consistency | **NOT NEEDED** | – | POS and online share one Shopify inventory, which syncs near-instantly. Manual process documented in STAFF_SOP if POS is not used. |
| 36 | Optimistic locking | **BUILD** | scripts/import-products.ts | Compares product updatedAt with .import-state.json; skips and warns if staff edited it since the last import. |
| 37 | Pessimistic locking | **NOT NEEDED** | – | Not needed; optimistic check (#36) is enough for a small team. |
| 38 | Distributed locks | **NOT NEEDED** | – | Only one person runs scripts at a time (documented). |
| 39 | Race conditions | **BUILD** | scripts/import-products.ts | Same updatedAt check; stock is only overwritten with --sync-stock so POS sales are not undone. |
| 40 | Deadlocks | **NOT NEEDED** | – | No locks of our own. |
| 41 | Memory leaks | **BUILD** | theme/assets/theme.js | Components clean up listeners with AbortController on disconnect/section unload; Lighthouse long-task check in CI. |
| 42 | Garbage collection | **NOT NEEDED** | – | Browser/Node default. |
| 43 | Thread safety | **NOT NEEDED** | – | Single-threaded JS. |
| 44 | Backpressure | **BUILD** | scripts/prepare-images.ts | Images processed in batches (default 3 folders at a time). |
| 45 | Autoscaling | **PLATFORM** | Shopify | Handles traffic spikes (e.g. Black Friday). |
| 46 | Horizontal scaling | **PLATFORM** | Shopify | – |
| 47 | Vertical scaling | **PLATFORM** | Shopify | – |
| 48 | CDN | **PLATFORM** | Shopify CDN | Assets and images served from cdn.shopify.com. |
| 49 | Edge caching | **BUILD** | theme | Static assets referenced with asset_url so the CDN caches them. |
| 50 | Cache invalidation | **BUILD** | theme | asset_url adds a version query string that changes on every upload. |
| 51 | Feature flags | **BUILD** | Theme settings | Toggles for each trust claim, newsletter prompt, WhatsApp links, announcement messages (with end date). |
| 52 | Blue-green deployment | **PLATFORM** | Shopify themes | Publishing a theme is atomic; the old live theme stays as an unpublished backup. |
| 53 | Canary releases | **NOT NEEDED** | – | Use preview links (?preview_theme_id=) instead. |
| 54 | Rolling deployments | **PLATFORM** | Shopify | – |
| 55 | Rollbacks | **BUILD** | docs/RUNBOOK.md | Keep previous theme unpublished; git tag per release; backup CSV restores product data. |
| 56 | Health checks | **BUILD** | scripts/smoke-test.ts | Hits home, a collection, a product, cart, search, sitemap; checks status, key elements and no "DBS". |
| 57 | Liveness / readiness probes | **PLATFORM** | Shopify | – |
| 58 | Monitoring | **BUILD** | docs/RUNBOOK.md | Uptime monitor on the domain (free UptimeRobot or similar [needs approval]); Shopify Analytics. |
| 59 | Logging | **BUILD** | scripts/lib/logger.ts | Every script writes logs/<script>-<timestamp>.log. |
| 60 | Distributed tracing | **NOT NEEDED** | – | Single platform. |
| 61 | Metrics | **BUILD** | scripts/weekly-report.ts | Weekly summary: active, sold out, only-1-left, drafts. |
| 62 | Alerts | **BUILD** | docs/RUNBOOK.md | Uptime and SSL expiry alerts to the owner's email [TO CONFIRM]; CI failure emails from GitHub. |
| 63 | SLOs | **BUILD** | this file (below) | Lighthouse ≥ 90 perf, LCP < 2.5 s, CLS < 0.05, 99.9 % uptime (Shopify). |
| 64 | SLIs | **BUILD** | this file (below) | Documented with #63. |
| 65 | Error budgets | **BUILD** | this file (below) | Documented with #63. |
| 66 | Observability | **BUILD** | this file (below) | One-page summary of how monitoring, logs and reports fit together. |
| 67 | Secrets management | **BUILD** | .env / GitHub secrets | Tokens only in .env (git-ignored) or GitHub Actions secrets. Rotation steps in RUNBOOK. |
| 68 | IAM | **BUILD** | docs/HANDOVER.md | Collaborator access, staff accounts with least privilege; owner keeps store ownership, domain and payments. |
| 69 | OAuth | **PLATFORM** | Shopify | Custom app token issued by Shopify. |
| 70 | JWT rotation | **PLATFORM** | Shopify | – |
| 71 | TLS (SSL) | **PLATFORM** | Shopify | Free automatic certificate for the custom domain. |
| 72 | Encryption at rest | **PLATFORM** | Shopify | – |
| 73 | Encryption in transit | **PLATFORM** | Shopify | HTTPS everywhere. |
| 74 | WAF | **PLATFORM** | Shopify | – |
| 75 | DDoS protection | **PLATFORM** | Shopify | – |
| 76 | CORS | **BUILD** | theme.js | Storefront only calls same-origin Shopify endpoints (/cart, /search/suggest, /recommendations). |
| 77 | CSRF | **BUILD** | theme | All forms use Shopify {% form %} tags, so Shopify's CSRF protection applies. |
| 78 | SQL injection | **PLATFORM** | Shopify | No database of our own. |
| 79 | XSS | **BUILD** | theme | All merchant/customer text output with | escape; JSON-LD via | json; no innerHTML of user input in JS. |
| 80 | SSRF | **BUILD** | scripts/lib/shopify.ts | assertAllowedHost(): scripts only call *.myshopify.com and Shopify staged-upload hosts. Unit tested. |
| 81 | Database migrations | **BUILD** | scripts/setup-store.ts | Metafields, collections, menus, pages created by a versioned, re-runnable script. |
| 82 | Schema versioning | **BUILD** | scripts/setup-store.ts | STRUCTURE_VERSION stored on the shop as metafield gbg.structure_version. |
| 83 | Disaster recovery | **PLATFORM** | Shopify + scripts/backup-export.ts | Shopify handles infra DR; our monthly export restores catalogue, pages, menus and redirects. |
| 84 | Backups | **BUILD** | scripts/backup-export.ts | Full export before launch, then monthly (products, collections, pages, menus, redirects, discounts…). |
| 85 | Failover | **PLATFORM** | Shopify | – |
| 86 | Multi-region deployment | **NOT NEEDED** | – | UK-only shop on a global platform. |
| 87 | Chaos engineering | **NOT NEEDED** | docs/ACCEPTANCE_TESTS.md | Instead: test checkout with a declined card and an out-of-stock race (two baskets, one last item). |
| 88 | Cost optimization | **BUILD** | docs/HANDOVER.md | Minimal apps; every recurring cost listed. |
| 89 | Cold starts | **PLATFORM** | Shopify | – |
| 90 | Serverless limits | **NOT NEEDED** | – | None used. Admin API limits are handled by #1. |
| 91 | Latency | **BUILD** | docs/ACCEPTANCE_TESTS.md | Measured on a real budget Android and an iPhone; recorded in acceptance evidence. |
| 92 | Throughput | **PLATFORM** | Shopify | – |
| 93 | P99 latency | **BUILD** | docs/ACCEPTANCE_TESTS.md | Recorded from CrUX / PageSpeed Insights once traffic exists; real-device tests before. |
| 94 | Tail latency | **PLATFORM** | Shopify | – |
| 95 | Network partitions | **PLATFORM** | Shopify | – |
| 96 | Clock skew | **PLATFORM** | Shopify | – |
| 97 | DNS | **BUILD** | docs/STORE_SETUP_CHECKLIST.md §Domain | A record 23.227.38.65 for the root, CNAME www → shops.myshopify.com, plus SPF/DKIM/DMARC for the sender domain. |
| 98 | TCP vs UDP | **PLATFORM** | Shopify | – |
| 99 | HTTP/2 and HTTP/3 | **PLATFORM** | Shopify | Served by Shopify's edge. |
| 100 | gRPC | **NOT NEEDED** | – | Not applicable. |
| 101 | Webhooks | **BUILD** | – | NOT NEEDED at launch unless a later integration requires them. |
| 102 | API versioning | **NOT NEEDED** | scripts/lib/config.ts | Admin API pinned to 2026-10; upgrade each April (versions are supported ~12 months). Noted in RUNBOOK. |
| 103 | Semantic versioning | **BUILD** | CHANGELOG.md; git tags | Theme releases tagged v1.0.0 and up. |
| 104 | Infrastructure as code | **BUILD** | theme/, config/collections.json, scripts/ | Theme in Git; store structure in scripts; settings checklist in docs. |
| 105 | Terraform | **NOT NEEDED** | – | No infrastructure to provision. |
| 106 | Helm charts | **NOT NEEDED** | – | No Kubernetes. |
| 107 | Build caching | **BUILD** | .github/workflows/ci.yml | actions/setup-node npm cache. |
| 108 | Dependency hell | **BUILD** | package-lock.json; .github/dependabot.yml | Lockfile, Dependabot weekly, npm audit in CI. |
| 109 | Production incidents | **BUILD** | docs/RUNBOOK.md | Playbooks: site down, checkout failing, wrong price live, oversold item, DBS branding found, payment issue. |
| 110 | On-call | **BUILD** | docs/RUNBOOK.md | Who to call and how [TO CONFIRM names and numbers]. |
| 111 | Postmortems | **BUILD** | docs/RUNBOOK.md | Short blameless template. |

---

## SLOs, SLIs and error budgets (#63–#65)

| SLI (what we measure) | SLO (target) | How it is measured | Error budget |
|---|---|---|---|
| Lighthouse mobile performance (home, collection, product) | ≥ 90 | Lighthouse CI on every PR / deploy | Any score < 90 blocks the release |
| Lighthouse accessibility, best practices, SEO | ≥ 95 | Lighthouse CI | Blocks the release |
| Largest Contentful Paint, mid-range Android, 4G | < 2.5 s | Lighthouse CI; PageSpeed Insights field data (CrUX) monthly | 1 template may exceed by ≤ 0.3 s for one month while fixed |
| Cumulative Layout Shift | < 0.05 | Lighthouse CI | Blocks the release |
| Storefront uptime | 99.9 % / month (Shopify) | Uptime monitor, 5-minute checks | ~43 minutes / month; anything beyond → contact Shopify Support |
| Smoke test (key pages, no "DBS") | 100 % pass | `npm run smoke` after every deploy + weekly | Any failure → RUNBOOK |

## Observability in one page (#66)

```
 Visitors ──► Shopify storefront ──► Shopify Analytics (sales, sessions, conversion)
                   │                └► Customer events / GA4 pixel (after consent)
                   │
 Uptime monitor ───┘ (every 5 min) ──► email alert to owner (site down / SSL expiring)

 GitHub Actions
   ├─ every PR: Theme Check · types · unit tests · Playwright · Lighthouse CI  ──► red X on the PR
   ├─ after deploy to preview: smoke + Playwright against the preview theme
   └─ weekly (Mon): weekly report + smoke test ──► reports/weekly-*.md artifact

 Scripts (run by staff/developer)
   └─ logs/<script>-<timestamp>.log · reports/import-*.md · failed_rows.csv
```

- **Something looks wrong on the site?** Check the uptime monitor, then Shopify status (shopifystatus.com), then the RUNBOOK.
- **Something looks wrong in the catalogue?** Read the latest weekly report and the import logs.
