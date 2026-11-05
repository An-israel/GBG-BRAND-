# Brief audit – what was built, what wasn't

Checked line by line against *GBG_Bargain_Shop_Claude_Code_Prompt.pdf* (sections 1–17) and
*GBG_Bargain_Shop_Website_Launch_Pack.docx*. Status: ✅ built · 🟡 partly built · ❌ not built · 🔒 needs store access or owner input (cannot be done from code alone).

## Not built or only partly built

| # | Brief item | Status | Detail |
|---|---|---|---|
| 1 | §2 Fork Shopify's **Dawn** theme | 🟡 | Written from scratch in Dawn's style (web components, no jQuery). Not a literal fork of Dawn. |
| 2 | §3.4 Product card: **tap** swap to the second image | 🟡 | Hover swap only (desktop). On phones a tap opens the product. |
| 3 | §6.3 Product details: **colour** | ❌ | No colour field. Colour only shows if it is a variant option or in the description. The colour filter (§6.2) has no data to filter on. |
| 4 | §6.3 "You may also like" **from the same collection** | 🟡 | Uses Shopify's automatic recommendations, not "same collection". |
| 5 | §6.6 **Branded default social preview image** | 🟡 | There is a setting to upload one, but no image was designed or included. |
| 6 | §5.2 Last Chance "or inventory 1 where reliable" | 🟡 | Tag `last-chance` only. No stock-based rule (optional in the brief). |
| 7 | §13 Playwright: "collection-only product shows **only pickup at checkout**" | 🟡 | The test checks the product-page label. The checkout step is a manual test in ACCEPTANCE_TESTS (checkout pages can't be automated reliably). |
| 8 | §14 #84 **Monthly** backup | 🟡 | Backup script built. It is not scheduled, so it has to be run by hand each month. |
| 9 | §14 #103 Git tag **v1.0.0** | ❌ | Not tagged yet (planned for launch). |
| 10 | §13 / §9 Admin guide and setup checklist **with screenshots** | 🟡 | Storefront screenshots included. No Shopify-admin screenshots: they need store access. |
| 11 | Launch pack §12 example copy: "Find something you love?…" and "Check our opening hours before visiting." | ❌ | Not used on the site. |
| 12 | Launch pack §16 **itemised fixed-price quotation** | ❌ | Not produced. It is a commercial document for a developer to price. |
| 13 | Launch pack §11 **banners designed from real inventory** | ❌ | No real product photos exist yet. The hero collage is built and waiting for them. |
| 14 | §3.6 Self-review scores | 🟡 | Done, but scored by me from the offline preview (sample products). Re-score on the real preview theme. |

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
