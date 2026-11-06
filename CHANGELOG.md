# Changelog

All notable changes to the GBG Bargain Shop theme and scripts. Versions follow semantic versioning; each release is tagged `vX.Y.Z`.

## [1.0.0] – 2026-11-05 (pre-launch, awaiting owner approval)
### Added
- Custom Online Store 2.0 theme: home (announcement, hero collage, category grid, featured tabs, value strip, Visit Us, clearance banner, newsletter), collection with filters/sort/load more, product page (gallery with swipe/zoom, condition, stock, pickup, WhatsApp, sticky add-to-basket), search with predictive results, basket drawer and page, 404, pages (Visit, Contact, FAQ), customer accounts, password and gift card.
- Structured data: Product/Offer, BreadcrumbList, Store, Organization, FAQPage.
- Admin scripts: setup-store, validate-products, prepare-images, import-products, weekly-report, backup-export, dbs-audit, import-redirects, smoke-test.
- Branded notification templates, draft pages and UK policy drafts, GA4 consent-mode custom pixel.
- Tests: unit (validator, images, API client), Playwright end-to-end and axe accessibility; CI with Theme Check and Lighthouse CI.
- Documentation set (see README).
- From the brief audit: tap-to-swap second photo on product cards (touch screens, plus swipe); Colour metafield (product page, filter, CSV column, validator, importer, alt text); "You may also like" from the same collection with fallback to Shopify recommendations; branded default social preview image; optional "only 1 in stock" rule for Last Chance; monthly backup workflow; Launch Pack copy ("Find something you love?…", "Check our opening hours before visiting.").
