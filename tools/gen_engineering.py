"""Generates docs/ENGINEERING.md – all 111 production-engineering items (brief §14)."""
from pathlib import Path

B, P, N = 'BUILD', 'PLATFORM', 'NOT NEEDED'
items = {
 1: ('Rate limiting', B, 'scripts/lib/shopify.ts', 'Reads GraphQL throttleStatus and waits before the cost bucket runs dry; honours Retry-After.'),
 2: ('Caching', B, 'theme snippets; scripts/import-products.ts', 'Responsive srcset/sizes on every image; importer caches location, publication and shipping-profile IDs once per run.'),
 3: ('Load balancing', P, 'Shopify', 'Shopify storefront and checkout are load-balanced by Shopify.'),
 4: ('Reverse proxies', P, 'Shopify / Cloudflare', 'Shopify fronts all traffic with its edge network.'),
 5: ('API gateways', P, 'Shopify Admin API', 'Admin API is Shopify\'s gateway; scripts only talk to it.'),
 6: ('CI/CD', B, '.github/workflows/ci.yml', 'Theme Check, types, unit tests, Playwright and Lighthouse CI on every pull request; deploys only to the unpublished preview theme (code only – theme-editor content is never overwritten). Live theme is published by hand after sign-off.'),
 7: ('Docker', B, '.devcontainer/devcontainer.json', 'Optional devcontainer (Node 22 + Shopify CLI + Playwright) so scripts run the same everywhere.'),
 8: ('Kubernetes', N, '–', 'No servers to orchestrate: Shopify hosts everything.'),
 9: ('Service discovery', N, '–', 'Only one service (Shopify); nothing to discover.'),
 10: ('Circuit breakers', N, '–', 'Scripts are short-lived batch jobs; retry + exponential backoff (#12, #13) is enough.'),
 11: ('Timeouts', B, 'scripts/lib/shopify.ts; theme.js', 'AbortController timeout on every Admin API call (30 s), image upload (60 s) and storefront fetch (10 s).'),
 12: ('Retries', B, 'scripts/lib/shopify.ts', 'Up to 5 retries on 429, 5xx, THROTTLED, timeouts and network errors. Unit tested.'),
 13: ('Exponential backoff', B, 'scripts/lib/shopify.ts', 'backoffDelay(): base × 2^attempt + jitter, capped at 30 s. Unit tested.'),
 14: ('Idempotency', B, 'scripts/import-products.ts, setup-store.ts', 'Import keyed by SKU (update, never duplicate); setup skips anything that already exists.'),
 15: ('Message queues', N, '–', 'No asynchronous back-end work at launch.'),
 16: ('Pub/sub', N, '–', 'Theme publishes analytics events through Shopify\'s own Web Pixels bus only.'),
 17: ('Event-driven architecture', N, '–', 'Not needed for a single-store catalogue.'),
 18: ('Distributed transactions', N, '–', 'Checkout and inventory are atomic inside Shopify.'),
 19: ('Saga pattern', N, '–', 'No multi-service workflows.'),
 20: ('Dead letter queues', B, 'scripts/import-products.ts', 'Rows that fail go to failed_rows.csv with a plain-English reason; fix and re-run.'),
 21: ('Cron jobs', B, '.github/workflows/weekly.yml; scripts/weekly-report.ts', 'Weekly report: sold-out items still featured, missing condition / alt text, New Arrival tags > 30 days.'),
 22: ('WebSockets', N, '–', 'No real-time features.'),
 23: ('Long polling', N, '–', 'No real-time features.'),
 24: ('Server-sent events', N, '–', 'No real-time features.'),
 25: ('Database indexing', B, 'scripts/setup-store.ts', 'Metafields (condition, collection_only) are filterable for Search & Discovery; consistent category tags.'),
 26: ('Query optimization', B, 'theme sections', 'Collections paginated (24 per load); no loops over all products; recommendations loaded lazily.'),
 27: ('N+1 queries', B, 'theme + scripts', 'No per-item lookups inside loops: shared IDs cached, collection checks use products_count.'),
 28: ('Connection pooling', P, 'Shopify', 'Managed by Shopify.'),
 29: ('Read replicas', N, '–', 'No database of our own.'),
 30: ('Sharding', N, '–', 'Shopify shards internally; nothing to do.'),
 31: ('Partitioning', N, '–', 'No database of our own.'),
 32: ('Replication', P, 'Shopify', 'Shopify replicates store data.'),
 33: ('Leader election', N, '–', 'No clustered services.'),
 34: ('CAP theorem', N, '–', 'Shopify treats inventory as strongly consistent at checkout; an item with 0 stock cannot be bought (inventoryPolicy DENY).'),
 35: ('Eventual consistency', N, '–', 'POS and online share one Shopify inventory, which syncs near-instantly. Manual process documented in STAFF_SOP if POS is not used.'),
 36: ('Optimistic locking', B, 'scripts/import-products.ts', 'Each import stamps the product with metafield gbg.imported_at; if Shopify updatedAt is later (beyond 2 min) staff edited it, so it is skipped with a warning. Works from any computer or CI.'),
 37: ('Pessimistic locking', N, '–', 'Not needed; optimistic check (#36) is enough for a small team.'),
 38: ('Distributed locks', N, '–', 'Only one person runs scripts at a time (documented).'),
 39: ('Race conditions', B, 'scripts/import-products.ts', 'Same updatedAt check; stock is only overwritten with --sync-stock so POS sales are not undone.'),
 40: ('Deadlocks', N, '–', 'No locks of our own.'),
 41: ('Memory leaks', B, 'theme/assets/theme.js', 'Components clean up listeners with AbortController on disconnect/section unload; Lighthouse long-task check in CI.'),
 42: ('Garbage collection', N, '–', 'Browser/Node default.'),
 43: ('Thread safety', N, '–', 'Single-threaded JS.'),
 44: ('Backpressure', B, 'scripts/prepare-images.ts', 'Images processed in batches (default 3 folders at a time).'),
 45: ('Autoscaling', P, 'Shopify', 'Handles traffic spikes (e.g. Black Friday).'),
 46: ('Horizontal scaling', P, 'Shopify', '–'),
 47: ('Vertical scaling', P, 'Shopify', '–'),
 48: ('CDN', P, 'Shopify CDN', 'Assets and images served from cdn.shopify.com.'),
 49: ('Edge caching', B, 'theme', 'Static assets referenced with asset_url so the CDN caches them.'),
 50: ('Cache invalidation', B, 'theme', 'asset_url adds a version query string that changes on every upload.'),
 51: ('Feature flags', B, 'Theme settings', 'Toggles for each trust claim, newsletter prompt, WhatsApp links, announcement messages (with end date).'),
 52: ('Blue-green deployment', P, 'Shopify themes', 'Publishing a theme is atomic; the old live theme stays as an unpublished backup.'),
 53: ('Canary releases', N, '–', 'Use preview links (?preview_theme_id=) instead.'),
 54: ('Rolling deployments', P, 'Shopify', '–'),
 55: ('Rollbacks', B, 'docs/RUNBOOK.md', 'Keep previous theme unpublished; git tag per release; backup CSV restores product data.'),
 56: ('Health checks', B, 'scripts/smoke-test.ts', 'Hits home, a collection, a product, cart, search, sitemap; checks status, key elements and no "DBS".'),
 57: ('Liveness / readiness probes', P, 'Shopify', '–'),
 58: ('Monitoring', B, 'docs/RUNBOOK.md', 'Uptime monitor on the domain (free UptimeRobot or similar [needs approval]); Shopify Analytics.'),
 59: ('Logging', B, 'scripts/lib/logger.ts', 'Every script writes logs/<script>-<timestamp>.log.'),
 60: ('Distributed tracing', N, '–', 'Single platform.'),
 61: ('Metrics', B, 'scripts/weekly-report.ts', 'Weekly summary: active, sold out, only-1-left, drafts.'),
 62: ('Alerts', B, 'docs/RUNBOOK.md', 'Uptime and SSL expiry alerts to the owner\'s email [TO CONFIRM]; CI failure emails from GitHub.'),
 63: ('SLOs', B, 'this file (below)', 'Lighthouse ≥ 90 perf, LCP < 2.5 s, CLS < 0.05, 99.9 % uptime (Shopify).'),
 64: ('SLIs', B, 'this file (below)', 'Documented with #63.'),
 65: ('Error budgets', B, 'this file (below)', 'Documented with #63.'),
 66: ('Observability', B, 'this file (below)', 'One-page summary of how monitoring, logs and reports fit together.'),
 67: ('Secrets management', B, '.env / GitHub secrets', 'Tokens only in .env (git-ignored) or GitHub Actions secrets. Rotation steps in RUNBOOK.'),
 68: ('IAM', B, 'docs/HANDOVER.md', 'Collaborator access, staff accounts with least privilege; owner keeps store ownership, domain and payments.'),
 69: ('OAuth', P, 'Shopify', 'Custom app token issued by Shopify.'),
 70: ('JWT rotation', P, 'Shopify', '–'),
 71: ('TLS (SSL)', P, 'Shopify', 'Free automatic certificate for the custom domain.'),
 72: ('Encryption at rest', P, 'Shopify', '–'),
 73: ('Encryption in transit', P, 'Shopify', 'HTTPS everywhere.'),
 74: ('WAF', P, 'Shopify', '–'),
 75: ('DDoS protection', P, 'Shopify', '–'),
 76: ('CORS', B, 'theme.js', 'Storefront only calls same-origin Shopify endpoints (/cart, /search/suggest, /recommendations).'),
 77: ('CSRF', B, 'theme', 'All forms use Shopify {% form %} tags, so Shopify\'s CSRF protection applies.'),
 78: ('SQL injection', P, 'Shopify', 'No database of our own.'),
 79: ('XSS', B, 'theme', 'All merchant/customer text output with | escape; JSON-LD via | json; no innerHTML of user input in JS.'),
 80: ('SSRF', B, 'scripts/lib/shopify.ts', 'assertAllowedHost(): scripts only call *.myshopify.com and Shopify staged-upload hosts. Unit tested.'),
 81: ('Database migrations', B, 'scripts/setup-store.ts', 'Metafields, collections, menus, pages created by a versioned, re-runnable script.'),
 82: ('Schema versioning', B, 'scripts/setup-store.ts', 'STRUCTURE_VERSION stored on the shop as metafield gbg.structure_version.'),
 83: ('Disaster recovery', P, 'Shopify + scripts/backup-export.ts', 'Shopify handles infra DR; our monthly export restores catalogue, pages, menus and redirects.'),
 84: ('Backups', B, 'scripts/backup-export.ts; monthly-backup.yml', 'Full export before launch, then automatically on the 1st of every month (.github/workflows/monthly-backup.yml, 90-day private artifact).'),
 85: ('Failover', P, 'Shopify', '–'),
 86: ('Multi-region deployment', N, '–', 'UK-only shop on a global platform.'),
 87: ('Chaos engineering', N, 'docs/ACCEPTANCE_TESTS.md', 'Instead: test checkout with a declined card and an out-of-stock race (two baskets, one last item).'),
 88: ('Cost optimization', B, 'docs/HANDOVER.md', 'Minimal apps; every recurring cost listed.'),
 89: ('Cold starts', P, 'Shopify', '–'),
 90: ('Serverless limits', N, '–', 'None used. Admin API limits are handled by #1.'),
 91: ('Latency', B, 'docs/ACCEPTANCE_TESTS.md', 'Measured on a real budget Android and an iPhone; recorded in acceptance evidence.'),
 92: ('Throughput', P, 'Shopify', '–'),
 93: ('P99 latency', B, 'docs/ACCEPTANCE_TESTS.md', 'Recorded from CrUX / PageSpeed Insights once traffic exists; real-device tests before.'),
 94: ('Tail latency', P, 'Shopify', '–'),
 95: ('Network partitions', P, 'Shopify', '–'),
 96: ('Clock skew', P, 'Shopify', '–'),
 97: ('DNS', B, 'docs/STORE_SETUP_CHECKLIST.md §Domain', 'A record 23.227.38.65 for the root, CNAME www → shops.myshopify.com, plus SPF/DKIM/DMARC for the sender domain.'),
 98: ('TCP vs UDP', P, 'Shopify', '–'),
 99: ('HTTP/2 and HTTP/3', P, 'Shopify', 'Served by Shopify\'s edge.'),
 100: ('gRPC', N, '–', 'Not applicable.'),
 101: ('Webhooks', B, '–', 'NOT NEEDED at launch unless a later integration requires them.'),
 102: ('API versioning', N, 'scripts/lib/config.ts', 'Admin API pinned to 2026-10; upgrade each April (versions are supported ~12 months). Noted in RUNBOOK.'),
 103: ('Semantic versioning', B, 'CHANGELOG.md; git tags', 'Tagged v1.0.0 (pre-launch build); later releases v1.0.1, v1.1.0…'),
 104: ('Infrastructure as code', B, 'theme/, config/collections.json, scripts/', 'Theme in Git; store structure in scripts; settings checklist in docs.'),
 105: ('Terraform', N, '–', 'No infrastructure to provision.'),
 106: ('Helm charts', N, '–', 'No Kubernetes.'),
 107: ('Build caching', B, '.github/workflows/ci.yml', 'actions/setup-node npm cache.'),
 108: ('Dependency hell', B, 'package-lock.json; .github/dependabot.yml', 'Lockfile, Dependabot weekly, npm audit in CI.'),
 109: ('Production incidents', B, 'docs/RUNBOOK.md', 'Playbooks: site down, checkout failing, wrong price live, oversold item, DBS branding found, payment issue.'),
 110: ('On-call', B, 'docs/RUNBOOK.md', 'Who to call and how [TO CONFIRM names and numbers].'),
 111: ('Postmortems', B, 'docs/RUNBOOK.md', 'Short blameless template.'),
}
assert sorted(items) == list(range(1, 112)), 'missing items'
counts = {s: sum(1 for v in items.values() if v[1] == s) for s in (B, P, N)}
rows = '\n'.join(f'| {n} | {name} | **{status}** | {where} | {note} |' for n, (name, status, where, note) in sorted(items.items()))
md = f'''# Production engineering checklist (all 111 items)

This is a Shopify build: Shopify runs the servers, checkout, database, CDN and security, so most
infrastructure items are **PLATFORM** or **NOT NEEDED**. Each is still accounted for.
We deliberately add no infrastructure the shop does not need – it would only add cost and fragility.

**Totals:** {counts[B]} BUILD · {counts[P]} PLATFORM · {counts[N]} NOT NEEDED

| # | Item | Status | Where it lives | Notes |
|---|---|---|---|---|
{rows}

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
'''
Path('docs/ENGINEERING.md').write_text(md)
print('ENGINEERING.md written', counts)
