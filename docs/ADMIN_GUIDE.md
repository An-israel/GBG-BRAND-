# Owner's guide – running the GBG website

Plain-English guide for the owner and managers. Everything here is done in **Shopify admin**
(admin.shopify.com or the Shopify phone app). Screenshots of the storefront are in `docs/screenshots/`;
add admin screenshots to `docs/screenshots/admin/` during the handover walkthrough.

---

## 1. Changing the website (theme editor)

Shopify admin → **Online Store → Themes → Customize**. Choose a page at the top (Home page, Products, Collections…).
Click any section on the left to edit it. **Save** (top right) publishes the change.

| I want to… | Where |
|---|---|
| Change the yellow announcement bar | Header group → **Announcement bar** → message. Optional **End date** – `2026-12-05` or `05/12/2026` – hides it automatically after that day. Up to 3 messages: computers show them side by side, phones take turns every 6 seconds (with an arrow to skip). Only genuine messages. |
| Change hero photos / headline / buttons | Home page → **Hero**. Use real product photos (square, 1200 px+). Price tag text must be the real current price. |
| Change category tiles | Home page → **Category grid** → each Category → choose collection / image. Empty collections hide themselves. |
| Change featured products | Home page → **Featured products** → each tab → collection. |
| Switch "UK delivery" / "Free Liverpool collection" claims on or off | ⚙ **Theme settings → Trust claims**. Only switch on what is really set up. These switches also control the delivery note on product pages and in the basket, and the Click & Collect box in Visit Us. |
| "Price includes VAT" on product pages | Appears only when a VAT number is filled in (Theme settings → Shop details) and Shopify prices include tax. |
| Change opening hours, phone, email, address | ⚙ **Theme settings → Shop details**. Updates footer, Visit Us, contact page and Google data at once. |
| Turn WhatsApp links on/off | ⚙ Theme settings → **Social and WhatsApp**. |
| Newsletter pop-up | ⚙ Theme settings → **Newsletter prompt** (never shows on a first visit). |
| Change the "You may also like" products | Products → **You may also like** → *Products from*: same collection (default) or Shopify recommendations. |
| Change the text above Add to basket | Products → **Product information** → *Text above the Add to basket button*. |
| Change the social sharing image | ⚙ Theme settings → Brand and logo → *Default social preview image*. If empty, the built-in GBG image is used. |
| Edit FAQs | Pages → FAQ page template → **FAQs** section → questions. |
| Edit the Visit Us photos | Pages → Visit template → **Shop photos**. |
| Change colours | ⚙ Theme settings → **Colours** (contrast-checked – ask before changing). |

**Undo a mistake:** in the theme editor, use the undo arrow before saving; after saving, Online Store → Themes →
**⋯ → Duplicate** is your friend before big changes.

## 2. Products

- **Add one product by hand:** Products → Add product. Fill title, description, photos (main photo on white first),
  price, **Cost per item**, SKU, weight, quantity at "GBG Bargain Shop, Unit M10". Untick *Continue selling when out of stock*.
  Scroll to **Metafields**: set **Condition** (required), Colour, Condition notes, Dimensions, Tested (electricals), Collection only.
  Add tags (category + `new-arrival`). Status **Draft** → check → **Active**.
- **Add many products:** staff use the spreadsheet + scripts (STAFF_SOP, PRODUCT_CSV_GUIDE).
- **Approve the sample:** Products → filter **Status: Draft** → open each → check → set **Active**.
- **Sale price:** set *Compare-at price* **only** if the item was genuinely sold at that price. The site then shows a yellow sale tag.
- **Collection only (bulky):** set metafield *Collection only* = true **and** add the product to the **Collection only**
  shipping profile (Settings → Shipping and delivery → Collection only → Add products). The profile is what stops postage.
- **Sold out one-off:** nothing to do – stock 0 shows "Sold out" and blocks checkout. Archive it later.
- **Never delete** products that have orders – **Archive** them.

## 3. Menus and site map

The menu builds itself (see `docs/SITE_MAP.md`): **Shop · New in · Deals · Visit us · Help**. A category appears as soon as it
has products; empty ones are hidden. The site map is at `/collections`. To use a hand-made menu instead: Customize → Header →
Menu: "A Shopify menu".

| I want to… | Where |
|---|---|
| Change hero photos | Customize → Home page → **Hero** → click a **Product photo** block on the left → Select image. Empty slots show real products automatically. |
| Change the logo | Customize → ⚙ Theme settings (bottom left) → **Brand and logo**. |
| Phone photos look small or have grey edges | ⚙ Theme settings → Products → **Product photos in grids** → "Fill the square". |

## 3b. Collections

- Collections are automatic: a product joins **Bags & Accessories** when it has the tag `bags`, **Clearance** with `clearance`,
  **Under £5** when its price is under £5, **New Arrivals** with `new-arrival`.
- Best Bargains: tag `best-bargain`.
- Menus: Online Store → **Navigation** → Main menu / Customer care / Shop. Empty collections are hidden on the site automatically.

## 4. Orders

- **Delivery order:** Orders → open → pick and pack → **Fulfil item** → add tracking → customer gets the shipping email.
- **Pickup order:** set aside with the order number → **Mark as ready for pickup** (customer gets the email) →
  when collected check the order number → **Mark as picked up**.
- **Refund:** Orders → open → **Refund** → choose items → reason → refund. Only managers. Remember the law:
  14-day cancellation for online orders; faulty items always have rights (see Refund policy).
- **Out-of-stock race:** if two people bought the last item (very rare), refund one immediately with an apology.

## 5. Daily · weekly · monthly routine

**Daily**
- [ ] Reconcile sold-out items: anything sold in the shop is reduced online (automatic with POS).
- [ ] Confirm and fulfil online orders; mark pickups ready the same day.
- [ ] Reply to contact-form messages and WhatsApp within the promised time.

**Weekly (Monday)**
- [ ] Add new products (STAFF_SOP).
- [ ] Run the weekly report (`npm run report:weekly`, or read the GitHub Actions *weekly-report* artifact).
- [ ] Audit stock: spot-check 10 SKUs shelf vs Shopify.
- [ ] Refresh New Arrivals (remove `new-arrival` older than 30 days) and featured collections; take sold-out items out of Best Bargains.

**Monthly**
- [ ] Review analytics: Shopify Analytics → sales, top products, conversion; GA4 if set up.
- [ ] Remove unused apps (Settings → Apps) and check the recurring costs list in HANDOVER.md.
- [ ] Download the monthly backup (GitHub → Actions → *Monthly backup* → artifact) or run `npm run backup`, and keep it somewhere safe.

## 6. Who to call

See `docs/RUNBOOK.md` → *On-call*.
