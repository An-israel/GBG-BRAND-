# Changelog

All notable changes to the GBG Bargain Shop theme and scripts. Versions follow semantic versioning; each release is tagged `vX.Y.Z`.

## [1.0.1] – 2026-11-07
Fixes from `docs/INSPECTION_REPORT.md` (sections A and C).
### Fixed
- Prices typed with a comma (12,99) are rejected with a clear message instead of being read as £1,299.
- Products with two or three options (e.g. Size + Colour) validate and import correctly.
- iPhone HEIC photos are converted; photos are kept in camera order (IMG_9 before IMG_10).
- Delivery and Click & Collect wording only appears when the matching Trust claim is switched on; "Price includes VAT" only with a VAT number.
- Code-only theme deploys (`theme:push:code`, CI) never overwrite theme-editor content.
- Announcement end dates accept 2026-12-05 or 05/12/2026 (anything else never hides the message); phones rotate several messages.
- Password-reset message visible; saved address country pre-selected; search sort offers only supported options; sort labels no longer cut at ":" ("Price: low to high").
- Load more keeps the page address; emptied basket hides "Continue shopping"; fast + taps add up.
- Emails: no placeholders, no promise of a missing unsubscribe link, no broken logo image.
- Menus link only to published pages (theme and setup script); setup re-uses the existing shop location.
- CI runs on the repository's default branch; Lighthouse CI on every pull request; dry-run logs say "would be …".
### Improved
- Small-photo warning; capital-letter tolerance for condition/tested; HTML in titles rejected; import stamp stored in Shopify (metafield `gbg.imported_at`) so imports work from any computer.
- Google product data: GTIN only for real barcodes; 14-day returns window (setting).
- Collection sort shows the collection's real default order; desktop filter sidebar; desktop menus open on hover; offline preview now tests the size picker; preview server compresses like Shopify.

## [1.0.0] – 2026-11-05 (pre-launch, awaiting owner approval)
### Added
- Custom Online Store 2.0 theme: home (announcement, hero collage, category grid, featured tabs, value strip, Visit Us, clearance banner, newsletter), collection with filters/sort/load more, product page (gallery with swipe/zoom, condition, stock, pickup, WhatsApp, sticky add-to-basket), search with predictive results, basket drawer and page, 404, pages (Visit, Contact, FAQ), customer accounts, password and gift card.
- Structured data: Product/Offer, BreadcrumbList, Store, Organization, FAQPage.
- Admin scripts: setup-store, validate-products, prepare-images, import-products, weekly-report, backup-export, dbs-audit, import-redirects, smoke-test.
- Branded notification templates, draft pages and UK policy drafts, GA4 consent-mode custom pixel.
- Tests: unit (validator, images, API client), Playwright end-to-end and axe accessibility; CI with Theme Check and Lighthouse CI.
- Documentation set (see README).
- From the brief audit: tap-to-swap second photo on product cards (touch screens, plus swipe); Colour metafield (product page, filter, CSV column, validator, importer, alt text); "You may also like" from the same collection with fallback to Shopify recommendations; branded default social preview image; optional "only 1 in stock" rule for Last Chance; monthly backup workflow; Launch Pack copy ("Find something you love?…", "Check our opening hours before visiting.").
