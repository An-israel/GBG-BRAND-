# Changelog

All notable changes to the GBG Bargain Shop theme and scripts. Versions follow semantic versioning; each release is tagged `vX.Y.Z`.

## [Tooling] – 2026-11-14
- **Update in place:** `npm run theme:update` and the GitHub button *"Update the client's theme"* put new code into the EXISTING theme and merge the theme-editor files, so the client's logo, photos, texts, settings and section changes are kept (new sections/settings are added; sections she deleted stay deleted; renamed categories are carried over). A backup of her editor files is saved before each update. CI preview deploys use the same merge. Guide: `docs/UPDATING_THE_THEME.md`.
- Shopify CLI references moved to version 5.

## [1.2.0] – 2026-11-14
Client direction: look like an established UK bargain retailer (her samples: Toolstation, flexykart, her mock-up).
### Changed
- Header follows the launch pack: **Shop ▾ · New Arrivals · Clearance · Visit Us**; Help moves to the footer, phone menu and site map. Deals sit inside the Shop menu.
- Text logo "GBG BARGAIN SHOP" (gold) with the tagline "BIG BARGAINS. SMALL PRICES."; labelled header icons (Our store · Sign in · Basket) on computers.
- Yellow bar: "Shop online • Visit us in Liverpool".
- Bold banner: patterned navy background, big yellow "BIG BARGAINS. SMALL PRICES.", buttons "Shop All Bargains" / "Visit Our Liverpool Store".
- New **promo tiles** section (Under £5 · Clearance · New Arrivals) in Toolstation style.
- **Icon strip** reduced to the client's three promises: Click & Collect · Fast Track (order by 2pm Mon–Fri, sent the same day) · Free delivery over £80 – gold line icons on a light band, settings in Theme settings → Icon strip and promises. Fast Track and free delivery also show on product pages; the basket shows "Spend £x more for free UK delivery".
- Categories renamed to the client's mock-up: **Bags · Shoes · Jewellery · Clothing · Home & Living · Electronics** (handles `bags`, `shoes`, `jewellery`, `clothing`, `home-living`, `electronics`; product tags `clothing`, `womens-clothing`… replace `fashion`).
- Category tiles: rounded photo with the name underneath (3 per row on phones); each tile takes the shop's own photo.

## [1.1.0] – 2026-11-11
Client feedback: the navigation and site map were hard to understand; pictures didn't show.
### Changed
- **Built-in GBG menu** (default): Shop · New in · Deals · Visit us · Help. Built from the shop's collections and pages, so it never shows the store's old DBS menus, empty collections or missing pages. One source (`snippets/nav-tree.liquid`) feeds the computer menu, phone menu, quick links, footer and site map. A Shopify menu can still be chosen in the Header settings.
- Computer: "Shop" mega menu with every category and sub-category plus an "All products" button; "Deals" in yellow.
- Phone: labelled MENU button; menu with search, big New in / Deals / Visit us buttons and "Shop by category"; quick-link chips under the search bar; compact contact row.
- **Site map** at `/collections` (exists on every store), linked from Help and the footer.
- Footer columns use the built-in lists (Shop, Help & information).
### Fixed
- Hero photo slots fill themselves with real in-stock products (real price, links to the product) until photos are uploaded.
- Category tiles and "Today's finds" fall back to the shop's real collections and products; tiles use a product photo when a collection has no image.
- "Visit Our Shop" buttons and announcement links go to the Visit us block on the home page until the page exists.
- New setting: product photos fill the square (best for phone photos) or show the whole item on white.
- Editor hints: where to add hero photos and where the logo is set.
- Open-menu arrow no longer flips icons inside the menu.

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
