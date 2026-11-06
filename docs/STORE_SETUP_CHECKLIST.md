# Store setup checklist (Shopify admin)

Shopify admin settings that code cannot set. For each item: **do it → test it → tick it → note who/when.**
Add a screenshot of each finished settings screen to `docs/screenshots/admin/` (file name = section number)
as evidence – Shopify's admin cannot be screenshotted from this repository, so these are taken on the day.

Legend: 🤖 = done by `npm run setup:store` · ✋ = by hand · ⚠ = waiting on an owner answer (`docs/TO_CONFIRM.md`)

---

## 0. Access and safety

- [ ] ✋ Owner invites the developer as a **collaborator** (Settings → Users and permissions → Collaborators) with only: Products, Online Store (themes, pages, navigation), Settings (shipping, notifications), Apps (develop apps). Owner keeps ownership, domain and payments.
- [ ] ✋ Staff accounts: one per person, least privilege (e.g. shop staff: Products + Orders only). No shared logins. Passwords never in chat or email.
- [ ] ✋ Full backup taken: `npm run backup` + duplicate the live theme (see INSTALL_ON_SHOPIFY.md).

## 1. Custom app for the scripts

Settings → **Apps and sales channels → Develop apps → Allow custom app development → Create an app** named `GBG scripts`.
Admin API scopes (nothing more):

| Scope | Why |
|---|---|
| `read_products`, `write_products` | Import products, metafields, tags |
| `read_inventory`, `write_inventory` | Stock at the GBG location |
| `read_locations`, `write_locations` | Check/create the GBG location |
| `read_publications`, `write_publications` | Publish collections/products to the Online Store |
| `read_content`, `write_content` | Pages |
| `read_online_store_navigation`, `write_online_store_navigation` | Menus, URL redirects |
| `read_shipping`, `write_shipping` | "Collection only" shipping profile |
| `read_legal_policies`, `write_legal_policies` | Policy drafts (only used with `--policies`) |
| `read_discounts`, `read_customers` | Backup/audit only (customer *counts* and consent stats, no personal data exported) |
| `read_metaobject_definitions` | (optional) future use |

- [ ] Install the app → copy the **Admin API access token** once → put it in `.env` as `SHOPIFY_ADMIN_TOKEN` (never commit, never paste in chat).
- [ ] For GitHub Actions, add it as repository secret `SHOPIFY_ADMIN_TOKEN`.
- [ ] Rotation: uninstall/reinstall the custom app to rotate (see RUNBOOK §Secrets).

## 2. Store details and rebrand (brief §11.4)

- [ ] ✋ Settings → **Store details**: store name **GBG Bargain Shop**; legal business name ⚠; address Unit M10, Stanley Meat Market, Prescot Road, Liverpool, L13 3AS; phone 07344 670317; customer email ⚠.
- [ ] ✋ Settings → **Notifications → Sender email**: ⚠ business email; sender name "GBG Bargain Shop". Verify the domain (adds DKIM – see §11 DNS).
- [ ] ✋ Online Store → **Preferences**: home page title "GBG Bargain Shop – Big bargains. Small prices. | Liverpool"; meta description (draft [FOR APPROVAL]): "Bargain bags, shoes, jewellery, homeware and everyday finds. Shop online or visit our Liverpool store at Stanley Meat Market." Social sharing image.
- [ ] ✋ Settings → **Checkout → Customize**: GBG logo, navy `#0B1F3A` buttons, gold accent, Inter/Archivo-like font.
- [ ] ✋ Settings → **Customer accounts**: decide classic vs new accounts; brand them; decide whether accounts are optional (recommended: optional).
- [ ] ✋ Work through every manual line in `docs/DBS_AUDIT.md`.

## 3. Metafields, collections, menus, pages 🤖

- [ ] `npm run setup:store -- --dry-run` – read the log.
- [ ] `npm run setup:store` – creates metafield definitions, location, collections **with products only**, "Collection only" shipping profile, hidden draft pages, menus.
- [ ] Re-run after each import so new categories appear (it never creates empty collections).
- [ ] Last Chance: tag-only by default. To also include every item with exactly 1 in stock, set `"lastChanceIncludesStockOfOne": true` in `config/collections.json` **before** the collection is first created (only sensible if most listings are NOT one-offs).
- [ ] Monthly backup: add repository variable `SHOPIFY_STORE_DOMAIN` and secret `SHOPIFY_ADMIN_TOKEN` – `.github/workflows/monthly-backup.yml` then exports on the 1st of each month (download the artifact and keep it safe).
- [ ] ✋ Search & Discovery app (free, by Shopify) → **Filters**: add Availability, Price, **Condition** (custom.condition), **Colour** (custom.colour), Product type, Size (variant option, if used). Filters only show when data exists.
- [ ] ✋ Online Store → Pages: after owner approval, set each page to **Visible**.

## 4. Location, stock and pickup (brief §8)

- [ ] 🤖 Location "GBG Bargain Shop, Unit M10" exists, **fulfils online orders**.
- [ ] ✋ Settings → **Shipping and delivery → Local pickup → GBG Bargain Shop, Unit M10 → Offer local pickup**.
  - Expected pickup time: ⚠ (e.g. "Usually ready in 24 hours"). Must match the theme setting *Collection ready time*.
  - Pickup instructions (draft [FOR APPROVAL]): "Come to Unit M10 inside Stanley Meat Market, Prescot Road. Bring your order number (the email is fine). If someone is collecting for you they need the order number and ⚠ photo ID."
- [ ] ✋ Test: place a pickup order → Orders → **Mark as ready for pickup** → check the "Ready for pickup" email arrives and looks right → **Mark as picked up**.
- [ ] ✋ Every product: "Continue selling when out of stock" **off** (the importer enforces this; check staff-created products).

## 5. Payments (brief §9.1)

- [ ] ⚠ Settings → **Payments**: Shopify Payments eligibility and verification complete (owner – bank and ID).
- [ ] ✋ Enable Shop Pay, Apple Pay, Google Pay *only if offered*. Payment icons in the footer update automatically.
- [ ] ✋ Fraud: Settings → Payments → Shopify Payments → Manage → fraud prevention; review "high risk" orders before fulfilling.
- [ ] ✋ Refunds process: who may refund (owner/manager role only).
- [ ] ✋ Test mode: enable **(for testing) Bogus Gateway**, place test orders (card `1` = success, `2` = failure, `3` = exception), then switch Bogus off.
- [ ] ✋ One real low-value live order with a real card → refund it → record the order number in ACCEPTANCE_TESTS.

## 6. Delivery (brief §9.2)

- [ ] ⚠ **General profile** → zone "United Kingdom" → weight-based rates (owner supplies rates; e.g. 0–1 kg, 1–2 kg, 2–5 kg, 5–10 kg). No free delivery unless the owner approves a threshold.
- [ ] 🤖/✋ **Collection only** profile: **no delivery zones**, only the GBG location. Add bulky products to it (the importer does this when *Collection only* = TRUE).
  - By hand: Settings → Shipping and delivery → **Create new profile** → name "Collection only" → add products → **do not add any zone** → Save. Shopify will warn "No rates" – that is intended: checkout can only offer pickup.
- [ ] ✋ Test: basket with a collection-only item → checkout offers **only Pickup**. Mixed basket (normal + collection-only) → checkout cannot ship the bulky item. Record evidence.
- [ ] ✋ Theme setting **Trust claims → UK delivery**: switch on only now.

## 7. Tax (brief §9.4)

- [ ] ⚠ Owner/accountant confirms VAT status.
- [ ] ✋ Settings → **Taxes and duties → United Kingdom**: if VAT-registered, collect VAT, enter VAT number, **prices include tax** on; if not registered, do not collect.
- [ ] ✋ Check a test receipt/invoice shows VAT correctly (or not at all).

## 8. Notifications (brief §9.5)

- [ ] ✋ Paste each `notifications/*.liquid` into its template (table in INSTALL_ON_SHOPIFY.md). Upload the email logo (Settings → Notifications → Customize email templates).
- [ ] ✋ Send a test of each. Check: GBG logo, navy/gold, shop address, no DBS wording, links work on a phone.
- [ ] ✋ Also check: Order cancelled, Order edited, Gift card, POS receipt (if POS) – update the logo/wording to GBG.

## 9. Customer privacy and analytics (brief §10.2, §12.3)

- [ ] ✋ Settings → **Customer privacy → Cookie banner**: on, region UK/EEA, "Accept / Decline / Manage preferences" – link to the Cookie Policy page.
- [ ] ✋ Settings → Customer events → GA4 custom pixel (`analytics/ga4-custom-pixel.js`), permission **Required**. Or the Google & YouTube app (not both).
- [ ] ✋ GA4 → Admin → **Data filters**: define internal traffic (shop IP) and exclude it; mark test orders by using a staff email.
- [ ] ✋ Test: fresh browser, decline → no requests to google-analytics.com (DevTools → Network). Accept → events arrive in GA4 DebugView.
- [ ] ✋ Marketing consent decision for old DBS subscribers recorded in `docs/MARKETING_CONSENT.md`.

## 10. POS (brief §8) ⚠

- **If Shopify POS will process all in-store sales:** install the POS app on the shop tablet/phone, add staff PINs (Settings → Users), order a card reader (WisePad 3 / Tap & Chip [cost in HANDOVER]), set the POS location to GBG Unit M10, brand the POS receipt. **Test:** sell the last unit of a product in POS → the online product shows "Sold out" within a minute. Record evidence.
- **If not:** follow the manual stock process in `docs/STAFF_SOP.md` §8 (adjust stock in Shopify immediately after every in-store sale of a listed item).

## 11. Domain and DNS (brief §11.5)

At the registrar for `gbgbargainshop.co.uk` ⚠ (owner logs in; the developer guides):

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `@` | `23.227.38.65` | Root domain → Shopify |
| CNAME | `www` | `shops.myshopify.com` | www → Shopify |
| TXT | `@` | `v=spf1 include:shops.shopify.com ~all` (merge with any existing SPF – only one SPF record allowed) | Sender authentication |
| CNAME ×3 | as shown in Shopify (Settings → Notifications → Sender email → Authenticate) | DKIM | Order emails not in spam |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:⚠dmarc@…` (move to `p=quarantine` after 4 weeks of clean reports) | DMARC |

Always copy the exact values Shopify shows in **Settings → Domains → Connect existing domain** – they win over this table.

- [ ] Settings → Domains → Connect `www.gbgbargainshop.co.uk` → verify → **Set as primary**. Root redirects to www.
- [ ] SSL shows "Issued" (can take up to 48 h).
- [ ] Old domain(s) stay connected and redirect to the primary.
- [ ] Old DBS URLs mapped in `redirects/redirects.csv` → `npm run redirects`.
- [ ] Check mobile loading on the new domain (4G, budget Android).

## 12. Launch day

- [ ] Written owner sign-off of ACCEPTANCE_TESTS.md
- [ ] Remove the storefront password (Online Store → Preferences)
- [ ] Publish the GBG theme (previous theme kept unpublished)
- [ ] Bogus Gateway off; real payments on
- [ ] `npm run smoke` passes on the live domain
- [ ] Google Search Console: add the domain property, submit `https://www.gbgbargainshop.co.uk/sitemap.xml`
- [ ] Google Business Profile: website URL updated
- [ ] Catalogue feeds (Google & YouTube, Facebook & Instagram, TikTok) reconnected to GBG accounts – only if used
- [ ] Uptime monitor on `https://www.gbgbargainshop.co.uk` with alerts to ⚠ owner email
- [ ] `git tag v1.0.0 && git push --tags`; CHANGELOG updated
