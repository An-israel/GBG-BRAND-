# Categories first – the shop's catalogue (launch pack site map)

The launch pack says the categories come **before** the products: the shop's structure is built
first, then products are put into it. This is how that works.

## The categories (exactly as the launch pack site map)

| Main category | Sub-categories | Web address |
|---|---|---|
| **Bags & Accessories** | Handbags · Backpacks · Purses · Travel | `/collections/bags-accessories` |
| **Shoes** | Women · Men · Kids | `/collections/shoes` |
| **Jewellery & Watches** | Earrings · Necklaces · Bracelets · Watches | `/collections/jewellery-watches` |
| **Fashion** | Women · Men · Kids | `/collections/fashion` |
| **Home & Kitchen** | Cookware · Storage · Household Essentials | `/collections/home-kitchen` |
| **Electronics & Gadgets** | Speakers · Small Electronics · Accessories | `/collections/electronics-gadgets` |
| **Beauty & Personal Care** | – | `/collections/beauty-personal-care` |
| **Bargains / Clearance** | Under £5 · Clearance · Last Chance | `/collections/under-5`, `/collections/clearance`, `/collections/last-chance` |

Plus **New Arrivals** and **Best Bargains** (used on the home page and in the menu).
The full list, with descriptions and SEO text, is in `config/collections.json` – the one place to change it.

- Categories show on the website **straight away, even while empty**: in the Shop menu, the home page
  tiles (with a yellow *Coming soon* badge), the footer and the site map. An empty category page says
  **"New stock coming soon"**, links to its sub-categories and invites people to visit the Liverpool shop.
- When the shop is full, the owner can hide empty ones: Customize → ⚙ Theme settings → **Categories** →
  untick *Show categories before products*. The heading and message on empty category pages are edited there too.

## Step 1 – Create the categories (once, by the GitHub button)

### a) Give GitHub a key to the store (once)

The button needs permission to create categories in Shopify. **The key is only ever typed into GitHub's
secret box – never into chat, email or a document.**

1. In Shopify, create an app for the shop's scripts:
   - **If the store admin has Settings → Apps and sales channels → Develop apps:** create an app called
     `GBG scripts`, give it the Admin API scopes listed in `docs/STORE_SETUP_CHECKLIST.md` §1, install it, then
     reveal the **Admin API access token** (starts `shpat_`) – it is shown once.
   - **Otherwise (newer stores – Shopify Dev Dashboard):** go to the Dev Dashboard (`dev.shopify.com`) → **Create app**
     `GBG scripts` → add the same Admin API scopes → **Release** → **Install** it on the GBG store. Then open the app's
     **Settings** and keep the **Client ID** and **Client secret** handy.
2. In GitHub, open the repository → **Settings → Secrets and variables → Actions**:
   - **Variables** tab → *New repository variable* → name `SHOPIFY_STORE_DOMAIN`, value the store's
     `something.myshopify.com` address (Shopify admin → Settings → Domains shows it).
   - **Secrets** tab → *New repository secret*:
     - name `SHOPIFY_ADMIN_TOKEN`, value the `shpat_…` token, **or**
     - two secrets `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` (Dev Dashboard app).

### b) Press the button

1. GitHub → **Actions** tab → **Create categories** (left list) → **Run workflow**.
2. Choose **Check only (changes nothing)** → Run. Open the finished run: the summary lists every category it
   *would* create. Nothing in the store has changed.
3. Happy? Run it again with **Create the categories**. Every category is created, published to the Online
   Store and appears on the website. Categories that already exist are left exactly as they are – pressing
   it twice does no harm.

(*Full store set-up* also creates the pages, menus, the shop location and the "Collection only" shipping
profile – the developer's first-time set-up, see `docs/STORE_SETUP_CHECKLIST.md`.)

Developers can do the same from a computer with `.env` filled in:
`npm run setup:store -- --only metafields,collections,tidy --dry-run`, then without `--dry-run`.

## Step 2 – Put products into categories

### One product by hand (Shopify admin)

Products → open the product → right-hand side, **Product organization → Collections** → tick the categories,
e.g. **Handbags**. Save.

You only need to tick the **sub-category**: once an hour the *Create categories* workflow adds the product to its
main category as well (Handbags → Bags & Accessories). Tick the main category too if you want it there instantly.
Tick **New Arrivals**, **Clearance**, **Last Chance** or **Best Bargains** whenever they apply.
**Under £5** fills itself from the price – nothing to tick.

### Many products (spreadsheet + importer)

Use the category tags in the **Tags** column (see `docs/PRODUCT_CSV_GUIDE.md`), e.g. `bags, handbags, new-arrival`.
The importer ticks each product into the matching categories (Handbags **and** Bags & Accessories, New Arrivals).
It only ever adds: a category staff ticked or unticked by hand on the product page is left alone.

| Tag | Category |
|---|---|
| `bags` · `handbags` · `backpacks` · `purses` · `travel` | Bags & Accessories · Handbags · Backpacks · Purses · Travel |
| `shoes` · `womens-shoes` · `mens-shoes` · `kids-shoes` | Shoes · Women · Men · Kids |
| `jewellery` · `earrings` · `necklaces` · `bracelets` · `watches` | Jewellery & Watches · Earrings · Necklaces · Bracelets · Watches |
| `fashion` · `womens-fashion` · `mens-fashion` · `kids-fashion` | Fashion · Women · Men · Kids |
| `home` · `cookware` · `storage` · `household` | Home & Kitchen · Cookware · Storage · Household Essentials |
| `electronics` · `speakers` · `small-electronics` · `tech-accessories` | Electronics & Gadgets · Speakers · Small Electronics · Accessories |
| `beauty` | Beauty & Personal Care |
| `clearance` · `last-chance` · `best-bargain` · `new-arrival` | Clearance · Last Chance · Best Bargains · New Arrivals |

## Good to know

- **New Arrivals** is hand-picked. The Monday report lists items older than 30 days;
  `npm run report:weekly -- --remove-old-tags` takes them out (tag and category).
- Renaming a category: change its **title** in Shopify (Products → Collections). Do **not** change its web address
  (handle) – the menus and home page use it.
- Adding a new category: add it to `config/collections.json` (and the menu list in `theme/snippets/nav-tree.liquid`),
  then press *Create categories* again.
- A category created as an automatic ("smart") collection by an older set-up stays automatic – the workflow warns
  about it. To switch it to tick-boxes, delete that collection in Shopify and press *Create categories* again.
