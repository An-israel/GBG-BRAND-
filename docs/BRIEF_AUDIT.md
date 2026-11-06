# Brief audit – what was built, what wasn't

Checked line by line against *GBG_Bargain_Shop_Claude_Code_Prompt.pdf* (sections 1–17) and
*GBG_Bargain_Shop_Website_Launch_Pack.docx*. Status: ✅ built · 🟡 partly built · ❌ not built · 🔒 needs store access or owner input (cannot be done from code alone).

## Not built or only partly built

Items 2, 3, 4, 5, 6, 8, 9 and 11 were built after the first audit (2026-11-06). What is still open:

| # | Brief item | Status | Detail |
|---|---|---|---|
| 1 | §2 Fork Shopify's **Dawn** theme | 🟡 | Written from scratch in Dawn's style (web components, no jQuery), not a literal fork. Rebuilding on a Dawn fork would mean starting the theme again. |
| 7 | §13 Playwright: "collection-only product shows **only pickup at checkout**" | 🟡 | Product-page label is tested automatically. The checkout step is a manual acceptance test (Shopify checkout can't be scripted reliably). |
| 10 | Admin guide / setup checklist **with Shopify-admin screenshots** | 🔒 | Needs store access. Storefront screenshots are included. |
| 12 | Launch pack §16 **itemised fixed-price quotation** | ❌ | A commercial document for a developer to price – not something to invent. |
| 13 | Launch pack §11 **banners designed from real inventory** | 🔒 | Needs real product photos. Hero collage, category tiles and the social image are ready. |
| 14 | §3.6 Self-review scores | 🟡 | Scored from the offline preview with sample products; re-score on the real preview theme. |

### Fixed after the first audit ✅

| # | Item | What was built |
|---|---|---|
| 2 | Tap swap to second image | Two-dot button (44 px) on cards with 2+ photos on touch screens, plus left/right swipe. Hover still works on desktop. Tested. |
| 3 | Colour | `custom.colour` metafield (filterable), shown on the product page, CSV column, validator warning for bags/shoes/clothing, importer, photo alt text. |
| 4 | "You may also like" from the same collection | Uses the collection the shopper came from, else the product's most specific category; "More in …" link; falls back to Shopify recommendations if fewer than 2 products. Setting to switch source. Tested. |
| 5 | Branded default social image | `theme/assets/og-default.png` (1200 × 630, GBG fonts/colours), used when no other image is set. |
| 6 | Last Chance "inventory 1" | Optional rule (`lastChanceIncludesStockOfOne` in `config/collections.json`), off by default because one-off items would all qualify. Unit tested. |
| 8 | Monthly backup | `.github/workflows/monthly-backup.yml`, 1st of each month, private 90-day artifact. |
| 9 | Git tag | `v1.0.0` created on commit 12d7663. GitHub refused the tag push from this session, so add it on GitHub: Releases → Draft a new release → tag `v1.0.0` → target branch `gbg-shopify-theme-v1`. |
| 11 | Launch Pack copy | "Find something you love?…" above Add to basket (editable); "Check our opening hours before visiting." in Visit Us. |

## Built, but never run against a real store 🔒

These exist and are tested offline. They have not been checked against the live Shopify store, because there was no access:

- The theme rendering on Shopify itself. The offline preview uses a stand-in for Shopify's template engine.
- Every admin script (setup, import, report, backup, DBS audit, redirects). Run each one with `--dry-run` first.
- Lighthouse scores (performance 90+ and the other targets). The tests are configured but have never run.
- The Playwright commerce tests: checkout start, sold-out, pixels before consent, live crawler.
- The email templates. Their syntax is checked, but none has been sent from Shopify.

## Built ✅

| Section | Built |
|---|---|
| §1 Business facts | Address and phone preset. Everything still unconfirmed is a setting left empty or a `[TO CONFIRM]` placeholder. No DBS name anywhere (CI fails the build if it appears). |
| §2 Platform & tools | OS 2.0 theme, everything editable in the theme editor. Theme Check passes with 0 errors. Git + GitHub Actions (Theme Check, Lighthouse CI, Playwright, unit tests). Deploys to an unpublished theme only. TypeScript Admin API scripts with `--dry-run` and logs. Token kept in `.env`. App list with costs in HANDOVER. |
| §3 Design | All colour tokens as theme settings, contrast table checked. Self-hosted Archivo and Inter fonts. 16px base text. Tabular price figures. Prices as the hero element with a yellow sale tag. Sticky header with search, bottom-sheet menu, 44px tap targets, sticky add-to-basket bar. Product-card badges: condition, Only 1 left, Collection only, quick add. Gold price tag, gold rule, bargain stripe. Light motion with reduced-motion support. On-brand empty states. No fake urgency. Newsletter prompt never on the first page view. Screenshots at 360, 390, 768 and 1440px. |
| §4 Scope | P0 theme/pages/checkout setup docs. P1: search, filters, featured, new-arrival sorting, email capture, WhatsApp, GA4. P2 estimates in P2_ESTIMATES.md. |
| §5 Navigation | Menu structure built by script. Empty collections hidden in the menu, tiles, footer and 404. Smart collections (Under £5, Clearance, Last Chance, New Arrivals plus categories) created only when they have products. Account icon only when accounts are on. |
| §6.1 Home | All 10 sections: announcement bar with end date, header with predictive search, hero, category grid, featured tabs, value strip with toggles, Visit Us with click-to-load map, clearance banner, newsletter, footer with enabled payment icons and legal line. |
| §6.2 Collection | Title, intro, count, filters, sort, "Load more", breadcrumbs. |
| §6.3 Product | Gallery with swipe and tap-zoom, GBP price with genuine compare-at only, stock status, condition badge and explanation, condition notes, dimensions, tested, variants, pickup availability, delivery or collection-only note, sticky bar, policy links, WhatsApp message prefilled with the product name and link. |
| §6.4 Other templates | Search (predictive + filters + empty state), basket drawer and page, 404, customer account pages, policy styling, password and gift card. |
| §6.5 Pages | About, Visit, Contact, FAQs, Shipping & Delivery, Click & Collect, Cookie: draft copy. Returns, Terms, Privacy, Shipping: policy drafts. |
| §6.6 SEO | Product/Offer with item condition, BreadcrumbList, Store, Organization and FAQPage structured data. Collection SEO titles and descriptions. Open Graph and Twitter tags. |
| §7 Catalogue | Metafield definitions with validations. Condition labels. No overselling. CSV template plus staff guide. Validator (all 10 checks). Image prep. 10-sample draft import. Full import keyed by SKU with a failed-rows file, staff-edit protection and the collection-only profile. |
| §8 Shop & POS | Location created or checked by script. POS yes/no paths and pickup setup in the checklist. STAFF_SOP. |
| §9 Checkout & CX | Payments, delivery, collection-only profile (script), Click & Collect, tax: click-by-click checklist. 9 branded email templates. Contact with reply-time setting. |
| §10 Legal | UK policy drafts marked DRAFT. Cookie/consent setup. GA4 pixel with Consent Mode v2. Map only after a click. Honesty rules enforced in code and in the validator. |
| §11 Migration | Backup script, DBS audit script, redirects script and CSV, domain/DNS steps, marketing-consent decision doc, after-launch list. |
| §12 SEO/speed/analytics | srcset/sizes, lazy loading, hero preload with high fetch priority, deferred JS, Lighthouse budgets, GA4 events (view_item, view_item_list, add_to_cart, begin_checkout, purchase, select_pickup, contact, whatsapp_click, directions_click). |
| §13 Quality | WCAG 2.2 AA axe tests (0 serious issues on 10 pages). Playwright suite. Unit tests for validator, images and API client. README, ADMIN_GUIDE, STAFF_SOP, STORE_SETUP_CHECKLIST, HANDOVER. |
| §14 Engineering | ENGINEERING.md covers all 111 items, plus SLOs and observability. RUNBOOK with incident playbooks, on-call table and postmortem template. Dependabot, npm audit, devcontainer, smoke test, weekly report job. |
| §15–16 | ACCEPTANCE_TESTS checklist, handover pack, 30-minute training script, daily/weekly/monthly routine, support-terms placeholders. |
| §17 | Plan and `[TO CONFIRM]` list in TO_CONFIRM.md. Design checkpoint in DESIGN_REVIEW.md. |
