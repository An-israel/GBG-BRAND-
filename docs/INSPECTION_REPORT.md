# Inspection report – 2026-11-07

**Scope:** everything (theme, admin scripts, spreadsheet tools, emails, analytics, CI, docs).
**Method:** offline only. The theme isn't on the store yet, so a simulated Shopify was used for the scripts and fake Shopify responses for the basket, search and pickup. Nothing was fixed in this pass.

**Automated baseline:** Theme Check 0 errors · 30/30 unit tests · 71/71 offline browser tests · 0 npm vulnerabilities ·
Lighthouse (offline preview, phone): performance 97–98, accessibility 100, best practices 96, SEO 91–92.

Severity: **High** = wrong data, money or a broken promise to customers · **Medium** = a feature misbehaves · **Low** = cosmetic or edge case.

---


## Fix status – 2026-11-07 (v1.0.1)

The owner asked to fix **section A (1–25)** and **section C (31–39)**. Section B (26–30) still needs the real store.

| # | Status | What changed · how it was checked |
|---|---|---|
| 1 | ✅ Fixed | Prices must use a dot; "12,99" gives a clear error (never £1,299). `1,299.00` still works. Unit tests. |
| 2 | ✅ Fixed | Up to 3 options (Size, Colour…) validated (missing or repeated combinations) and imported. Simulated-store import checked. |
| 3 | ✅ Fixed | iPhone HEIC converted with `heic-convert`; tested with two real HEIC files. |
| 4 | ✅ Fixed | Natural order (IMG_9 before IMG_10). Unit test and real-file run. |
| 5 | ✅ Fixed | Delivery note (product and basket) needs *UK delivery* on; Visit Us Click & Collect needs *Free Liverpool collection* on. Browser tests with claims on and off. |
| 6 | ✅ Fixed | CI deploy and the new `npm run theme:push:code` skip `settings_data.json` and template/section-group JSON. |
| 7 | ✅ Fixed | End date accepts `2026-12-05` or `05/12/2026`; anything else never hides the message, plus an editor note. Liquid unit tests. |
| 8 | ✅ Fixed | Phones rotate messages every 6 s (stops on touch, focus or reduced motion) with a "next" arrow. Browser test. |
| 9 | ✅ Fixed | Box uses `#recover` (where Shopify returns) and opens whenever there's a result; the cursor lands in the email field. Browser test. |
| 10 | ✅ Fixed | Saved country is pre-selected (defaults to United Kingdom). Browser test. |
| 11 | ✅ Fixed | "Price includes VAT." only shows when a VAT number is filled in. Browser test. |
| 12 | ✅ Fixed | Misleading unsubscribe sentence removed. Unit test. |
| 13 | ✅ Fixed | Setup script links only published pages and says to re-run `--only menus` after publishing; the theme also hides links to hidden pages. Simulated run. |
| 14 | ✅ Fixed | Re-uses the existing location; `--rename-location`, `--location-id`, `--create-location`. Simulated run. |
| 15 | ✅ Fixed | Deploy follows the repository's default branch; new Lighthouse CI on every pull request (offline preview) – ran locally, passes (performance 99–100, LCP 1.7–1.9 s). |
| 16 | ✅ Fixed | Search offers only Most relevant and the two price sorts. Also found and fixed a **new bug**: sort labels were cut at ":" ("Price" instead of "Price: low to high"). Browser test. |
| 17 | ✅ Fixed | Address bar no longer changes to `?page=2`. Browser test. |
| 18 | ✅ Fixed | "Continue shopping" hides when the basket empties. Browser test. |
| 19 | ✅ Fixed | Taps update the number at once; one request is sent for the final quantity (respects stock). A Remove straight after a tap cancels the pending tap (found during re-testing). Browser tests. |
| 20 | ✅ Fixed | Emails use `!= blank` for the logo. Unit test. |
| 21 | ✅ Fixed | `sizes` uses the real pixel width from settings. |
| 22 | ✅ Fixed | Dry-run logs say "would be created / WOULD CREATE". |
| 23 | ✅ Fixed | Desktop dropdowns open on hover (click and keyboard still work). Browser test. |
| 24 | ⛔ Blocked | GitHub refuses tag pushes from this session (branch pushes work). **Do it on GitHub:** Releases → Draft a new release → tag `v1.0.1` → target `gbg-shopify-theme-v1` → Publish. |
| 25 | ✅ Fixed | FAQ pricing question removed (owner can add it back when decided); contact answer has no placeholder; emails have no `[TO CONFIRM]`. Draft pages and policies in `content/` keep their placeholders on purpose – they stay hidden until approved. |
| 31 | ✅ Fixed | Warning (log and "Check" column) for photos under 800 px. |
| 32 | ✅ Fixed | Wrong capital letters are corrected with a warning; HTML in titles is an error. Unit tests. |
| 33 | ✅ Fixed | Import stamp stored on each product in Shopify (`gbg.imported_at`); `.import-state.json` no longer used. |
| 34 | ✅ Fixed | GTIN only for real 8/12/13/14-digit barcodes; returns window (default 14 days, setting) sent to Google. Delivery prices are not sent until rates are confirmed (never invent). |
| 35 | ✅ Fixed | The collection's real default sort comes first with its real name (e.g. "Best selling"). |
| 36 | ✅ Fixed | Theme no longer relies on preview-unsupported Liquid (`parentloop`, `nil | json`); the preview form tag passes attributes through; size-picker browser test added. |
| 37 | ⛔ Needs store | Shopify-admin screenshots can only be taken inside the store – to do during the handover walkthrough. |
| 38 | ✅ Fixed | Desktop (990 px+): filters are an always-visible sidebar and ticks apply at once; phones keep the drawer. Browser tests. |
| 39 | ✅ Fixed | Sticky-bar position check deferred to the next frame (no forced layout on load). |

Totals after the fixes: Theme Check 0 errors · 45 unit tests · 107 offline browser tests · Lighthouse CI (pull request) passing.

---

## A. Not working properly (confirmed by testing or reading the code)

| # | Area | Problem | How found | Severity |
|---|---|---|---|---|
| 1 | Checker + importer | A price typed with a comma (`12,99`) is read as **£1,299**. With no "was" price set, it would import at £1,299 with no error. | Test spreadsheet | High |
| 2 | Importer | Products with **two options** (e.g. Size + Colour): Option2 is ignored, so variants collide and the import fails. The checker gives no warning. | Test spreadsheet + code | High |
| 3 | Photo tool | **iPhone HEIC photos can't be read.** The image library only supports AVIF-type HEIF. They fail with "Invalid input". | Real file test | High |
| 4 | Photo tool | Files sort as text, so `IMG_10` comes before `IMG_9` and **the wrong photo becomes the main image**. | Real file test | Medium |
| 5 | Theme – honesty | Claims shown even when switched off: the product page always says "UK delivery available…"; the basket always shows the delivery note; Visit Us always shows "Click & Collect… collect free from Unit M10". Brief: "each claim only if configured". | Code + preview | High |
| 6 | Theme – settings | **Theme editor changes get overwritten.** The CI deploy and `npm run theme:push` upload `settings_data.json` and template JSON, replacing the owner's theme-editor changes on the preview theme. | Code | High |
| 7 | Theme | An announcement **end date in the wrong format** (e.g. `05/12/2026`) hides the message immediately. | Test | Medium |
| 8 | Theme | On **phones only the first announcement** is ever shown. Messages 2 and 3 are hidden. | CSS | Medium |
| 9 | Theme – accounts | "Forgotten your password?": after sending, the **success or error message is invisible**. The box only shows when `#Recover` is in the URL. | Code | Medium |
| 10 | Theme – accounts | Editing a saved address: the **country isn't pre-selected**, so the customer may save the wrong country. | Code | Medium |
| 11 | Theme | "Price includes VAT." shows whenever Shopify's "prices include tax" box is ticked, even if the shop isn't VAT-registered. | Code | Medium |
| 12 | Emails | The abandoned-checkout email says "use the unsubscribe link below", but there is **no link**. | Render test | Medium |
| 13 | Setup script | Pages are created **hidden**, but menus link to them. Shoppers get a 404 until the pages are published. | Simulated run | Medium |
| 14 | Setup script | If the store already has a location (the old DBS one), the script creates a **second location** instead of reusing it, so stock can split. | Simulated run | Medium |
| 15 | CI | Deploy, Lighthouse and preview tests only run on a branch named `main`, which doesn't exist (work is on `gbg-shopify-theme-v1`). Lighthouse never runs on pull requests, which the brief requires. | Workflow review | Medium |
| 16 | Theme – search | Search results offer **"Newest"** sort, which Shopify search doesn't support, so it does nothing. | Test | Low |
| 17 | Theme | Load more changes the address to `?page=2`, so a **refresh shows only page 2**. | Browser test | Low |
| 18 | Theme – basket | After removing the last item, "Continue shopping" stays under the empty-basket message (duplicated). | Browser test | Low |
| 19 | Theme – basket | A **fast double tap on +** only counts once while the basket updates. | Browser test | Low |
| 20 | Emails | If the logo setting holds an empty value, emails show a **broken empty image** instead of the text logo. | Render test | Low |
| 21 | Theme – speed | The logo's `sizes` uses a CSS variable, which browsers ignore, so they download a **bigger logo than needed**. | Code | Low |
| 22 | Scripts | Dry-run messages say "created" / "CREATED" although nothing changes, which is confusing. | Simulated run | Low |
| 23 | Theme – menu | Desktop dropdowns open on **click only, not hover**. | Browser test | Low |
| 24 | Git | Tag `v1.0.0` isn't on GitHub (the push was blocked). | Known | Low |
| 25 | Content | Placeholders visible to the public: the FAQ shows "[TO CONFIRM with owner]" and "[TO CONFIRM reply-time promise]" (also in the FAQ data Google reads); the order-confirmation and pickup emails show "[TO CONFIRM]". Needs owner answers before launch. | Render test | Medium |

## B. Can't be confirmed without the store (risks)

| # | Item | Why it's a risk |
|---|---|---|
| 26 | Variant picker (sizes/colours) | The logic works when tested. It relies on the form tag writing `data-product-form`, which must be confirmed on Shopify. The offline preview can't test it (gap). |
| 27 | Admin API calls | Shopify's API reference is blocked here, so these are unchecked: `productSet(identifier:)`, `productByHandle` / `collectionByHandle` (deprecated, may be removed), `pages(query:"handle:")`, `inventorySetQuantities.ignoreCompareQuantity`, a shipping profile with no zones, metafield `pin`. Run every script with `--dry-run` on the store first. |
| 28 | Pickup-ready email | Uses a `pickup_instructions` variable that may not exist in that template. |
| 29 | Live commerce | Checkout, pickup-only for collection-only items, emails actually sending, cookie banner blocking pixels, predictive search and filters with real data, recommendations. All are on the acceptance list. |
| 30 | Speed | LCP is 2.3–2.4 s offline, close to the 2.5 s target. Real photos and Shopify's servers will change it. |

## C. Works, but could be improved

| # | Item |
|---|---|
| 31 | Photo tool accepts **tiny photos** (e.g. 180 px) without a warning. |
| 32 | Checker: `tested working` in lower case is rejected instead of auto-corrected; HTML in titles isn't flagged. |
| 33 | Import memory (`.import-state.json`) lives only on the computer that ran the import. From another computer or CI, existing products are treated as "not ours" and skipped. |
| 34 | Product data for Google: the barcode is sent as a GTIN (wrong if it's an internal code); no shipping or returns info, so Google Merchant shows warnings. |
| 35 | Collection sort shows "Featured", but script-made collections default to best-selling or newest, so the label can mislead. |
| 36 | The offline preview can't test the variant picker, two-level menus or form attributes (preview limitations). |
| 37 | No Shopify-admin screenshots in the owner guide or setup checklist (needs store access). |
| 38 | Filters are only in a pop-out drawer; no always-visible sidebar on desktop. |
| 39 | Product page: minor speed notes (page size, one forced layout recalculation). |

## D. Working (verified)

| # | Feature |
|---|---|
| 40 | Add to basket opens the drawer and updates the count; sold-out (422) and network errors show a message |
| 41 | Quick add on cards; sticky add-to-basket bar submits correctly |
| 42 | Basket +, − and Remove send the correct line and quantity |
| 43 | Drawers and menu: Escape and backdrop close them; focus returns; the page unlocks scrolling |
| 44 | Filter drawer builds correct filter links; sort auto-submits |
| 45 | Load more appends products |
| 46 | Predictive search: needs 2+ letters; arrow keys and Enter work; Escape closes |
| 47 | Gallery: thumbnails, swipe, tap to zoom, Escape |
| 48 | Pickup availability requested from the correct Shopify address |
| 49 | WhatsApp link pre-fills the product name and link |
| 50 | Home tabs (click + arrow keys); map loads only after "Show map"; announcement hides after a correctly formatted end date |
| 51 | Analytics events: directions, WhatsApp, phone/email |
| 52 | No JavaScript errors on any page (apart from a preview-only artefact) |
| 53 | Keyboard: menu, search, tabs, drawers; accessibility 0 serious issues on 10 pages; Lighthouse accessibility 100 |
| 54 | Mobile: bottom-sheet menu, 44 px tap targets, no sideways scrolling, tap/swipe photo swap, sticky header is 18% of a small screen |
| 55 | Empty collections hidden from menus and tiles; newsletter consent wording with no pre-ticked boxes |
| 56 | Checker catches: duplicate SKU, bad handle, compare-at ≤ price, negative stock, bad condition/tested value, missing category, missing photos, DBS text |
| 57 | Photo tool: auto-rotate, white square main image, 2048 px limit, transparent PNG → white, alt-text drafts |
| 58 | Scripts run end to end on a simulated store: setup (skips empty collections), sample import as drafts, full import (only approved rows), weekly report (all 4 checks), DBS audit (12 hits found), backup (14 files), redirects (rejects bad paths), smoke test |
| 59 | All 9 emails render; no DBS text; phone and address present |
| 60 | Theme Check 0 errors; type check clean; 0 vulnerabilities; all documentation links valid |
