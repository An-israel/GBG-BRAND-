# Installing the GBG theme on Shopify

This puts the new theme on the existing store **without changing what customers see**. The current
live theme stays live until the owner signs off (brief §2, "Work safely").

There are two ways in. Pick **A** if you just want to look at it. Pick **B** if a developer will keep working on it.

---

## Before you start (5 minutes)

1. **Back up the current live theme.** Shopify admin → **Online Store → Themes** → on the current theme click
   **⋯ → Duplicate**. Rename the copy `DBS backup – do not delete – <date>`. (This is also your rollback.)
2. Make sure you are logged in as the **store owner** or a staff/collaborator account with the
   **Themes** permission.

---

## A. Upload the zip (no tools needed)

1. Get the file `dist/gbg-bargain-shop-theme-v1.0.1.zip` from this repository
   (or build a fresh one: `npm ci && npm run theme:zip`).
2. Shopify admin → **Online Store → Themes**.
3. Scroll to **Theme library** → **Add theme** → **Upload zip file** → choose the zip → **Upload**.
4. The theme appears in the Theme library as **"GBG Bargain Shop"** – **unpublished**. Customers still see the old theme.
5. Click **⋯ → Preview** to look around, or **Customize** to open the theme editor.
6. To share a preview with the owner: in the preview, click **Share preview** (bottom bar) and send the link.

> Do **not** click **Publish** until every item in `docs/ACCEPTANCE_TESTS.md` is signed off.

## B. Shopify CLI (for developers)

```bash
npm ci
npm install -g @shopify/cli@3
shopify theme push --path theme --unpublished --store <your-store>.myshopify.com
# prints the new theme ID and a preview link – keep the ID
shopify theme dev  --path theme --store <your-store>.myshopify.com   # live-reloading local preview
```

Later pushes go to the same unpublished theme **without touching what was set in the theme editor**:
`npm run theme:push:code -- --theme <ID>` (it skips `settings_data.json` and the template/section-group JSON, so banners, texts and settings chosen in the editor are kept).
Use the plain `shopify theme push` only for the very first upload.

---

## After installing: first settings (theme editor → ⚙ Theme settings)

| Setting group | What to do |
|---|---|
| **Brand and logo** | Upload the GBG logo (transparent PNG or SVG), favicon (square) and default social image (1200 × 628). |
| **Colours** | Leave as is – the GBG palette is preset and contrast-checked. |
| **Shop details** | Address and phone are pre-filled. Add **email, opening hours, reply-time promise, collection ready time, legal entity, company/VAT number** once the owner confirms them. Anything left empty is hidden – nothing is guessed. |
| **Social and WhatsApp** | Add social links. Switch **Show WhatsApp links** on only once the number is confirmed as WhatsApp Business. |
| **Trust claims** | Switch on **UK delivery** only when delivery rates are live, and **Free Liverpool collection** only when local pickup is enabled. |
| **Cart and delivery** | Check the collection/delivery notes match the real settings. |
| **Newsletter prompt** | Off by default. If switched on, it never shows on a first visit. |

Then, on the **Home page** in the theme editor: add real product photos to the 4 hero slots, choose a
shop photo for **Visit us**, and check each category tile's collection (tiles with empty collections
hide themselves).

## Create the pages, menus and collections

Either run the setup script (recommended – see `README.md` → *Admin scripts*):

```bash
cp .env.example .env     # add the store domain and the custom-app token
npm run setup:store -- --dry-run
npm run setup:store
```

…or create them by hand following `docs/STORE_SETUP_CHECKLIST.md`. The theme expects these handles:

| Type | Handle | Template |
|---|---|---|
| Page | `visit-our-shop` | `page.visit` |
| Page | `contact` | `page.contact` |
| Page | `faqs` | `page.faq` |
| Page | `about`, `click-and-collect`, `shipping-delivery`, `cookie-policy` | default |
| Menu | `main-menu`, `footer`, `footer-shop` | – |
| Collections | `bargains`, `new-arrivals`, `under-5`, `clearance`, `last-chance` + categories in `config/collections.json` | default |

## Email templates

For each file in `notifications/`, open Shopify admin → **Settings → Notifications**, choose the
matching template, click **Edit code**, paste the file's whole contents and **Save**. Send yourself a
test with **Send test email**.

| File | Shopify template |
|---|---|
| `order_confirmation.liquid` | Order confirmation |
| `pickup_ready.liquid` | Ready for local pickup |
| `shipping_confirmation.liquid` | Shipping confirmation |
| `shipping_update.liquid` | Shipping update |
| `refund.liquid` | Refund notification |
| `abandoned_checkout.liquid` | Abandoned checkout |
| `customer_account_activate.liquid` | Customer account invite |
| `customer_account_welcome.liquid` | Customer account welcome |
| `customer_password_reset.liquid` | Customer account password reset |

Replace every `[TO CONFIRM …]` (collection rules, hours) before going live.

## Analytics (optional, P1)

Shopify admin → **Settings → Customer events → Add custom pixel** → paste `analytics/ga4-custom-pixel.js`,
put in the GA4 measurement ID, set the permission to **Required** (analytics + marketing) → **Save → Connect**.
Turn on Shopify's cookie banner in **Settings → Customer privacy**. Use this pixel **or** the
Google & YouTube app – not both.

## Going live (only after written sign-off)

1. Online Store → Themes → GBG Bargain Shop → **Publish**.
2. The previous theme moves to the Theme library – keep it as the rollback.
3. Run `npm run smoke` and work through `docs/STORE_SETUP_CHECKLIST.md` → *Launch day*.
