# Updating the theme without losing the client's work

**Upload a zip once. After that, never again.** Every later version goes straight into the theme
that is already in the store, and everything the client did in the theme editor is kept.

## What is kept

| | Kept on every update? |
|---|---|
| Products, product photos, collections, pages, menus, orders, customers | ✅ Always – they belong to the store, not the theme |
| Files she uploaded (logo, banner and category photos) | ✅ Always – stored in Content → Files |
| **Theme editor work**: chosen logo, banner photos, category photos, headlines, texts, colours, switches, sections she added, removed or reordered | ✅ Yes – merged, never overwritten (this is what a zip upload used to lose) |
| New sections or settings in the new version | ➕ Added next to their neighbour. If she deleted a section, it is **not** brought back |
| Renamed categories (e.g. v1.2.0 "Fashion" → "Clothing") | 🔁 Her blocks follow the new name and keep their photos; labels she changed herself are kept |

Before every update, a **backup of her editor files** is saved (kept 90 days on GitHub).

## Option A (recommended): Shopify's "Connect from GitHub" – fully automatic

**One-time:** Shopify admin → **Online Store → Themes → Import → Connect from GitHub** → account `An-israel`,
repository `GBG-BRAND-`, branch **`shopify-theme`** → **Connect**.

- Shopify adds a new theme to the Theme library linked to that branch. This is the theme the client customises
  (and later publishes). The old zip-uploaded drafts can be deleted.
- **Every update is automatic:** when the developer pushes a change, GitHub copies it into the `shopify-theme`
  branch (`.github/workflows/sync-shopify-branch.yml`) and Shopify updates the connected theme by itself,
  usually within a minute or two.
- **Her editor work is kept:** when she saves in the theme editor, Shopify commits it to the `shopify-theme`
  branch; the sync merges new code around it (same rules as the table above).
- Only connect **`shopify-theme`** – the other branches (`gbg-shopify-theme-v1`, `dependabot/…`) are not themes.
- "Branch isn't a valid theme" means a branch without the theme at its top level was chosen.
- With a connected theme, do **not** also use Option B or zip uploads on that same theme.
- Don't edit files in the `shopify-theme` branch by hand – it is rewritten from `theme/` on every update.

## Option B: update button (theme uploaded as a zip, not connected)

### One-time setup (about 10 minutes)

**1. Get a Theme Access password (free app made by Shopify)**
1. Shopify admin → **Apps** → search **"Theme Access"** (by Shopify) → **Install**.
2. Open it → **Create password** → name `GBG GitHub` → your email address → **Create**.
3. Open the email from Shopify and copy the password (it starts with `shptka_`). It can be seen once only.

**2. Find the theme ID**
Online Store → Themes → on the GBG theme the client is working in click **Customize**. The address bar shows
`…/themes/`**`123456789012`**`/editor` – that number is the theme ID.

**3. Save them in GitHub** (repository → **Settings → Secrets and variables → Actions**)
- **Secrets** tab → **New repository secret**: name `SHOPIFY_CLI_THEME_TOKEN`, value = the `shptka_…` password.
- **Variables** tab → **New repository variable**:
  - `SHOPIFY_STORE_DOMAIN` = the store's `something.myshopify.com` address (Settings → Domains shows it)
  - `SHOPIFY_THEME_ID` = the theme ID from step 2

Never paste the password in a chat, email or file – only in that GitHub secret box.

### Every update (about 2 minutes)

1. GitHub → **Actions** → **"Update the client's theme"** → **Run workflow**.
2. Leave **mode = check only** → **Run**. Open the run: the log lists what will be added (new sections/settings)
   and confirms her work is kept. Nothing changes in the store.
3. Run it again with **mode = update**.
   - If the theme is the **published (live)** one, also tick **"This theme is the PUBLISHED (live) one"**.
     Safer for bigger changes: update an unpublished copy first, preview it, then publish.
4. Refresh the theme preview – the new version is there with her logo, photos and texts untouched.

Tip: ask the client not to be in the middle of editing (unsaved changes) at the moment you update.

## Without GitHub (from your own computer)

Needs Node.js and the Shopify CLI (`npm install -g @shopify/cli@5`, then `shopify theme list --store <store>` once to log in).

```bash
npm ci
npm run theme:update -- --theme 123456789012 --store something.myshopify.com --dry-run   # check
npm run theme:update -- --theme 123456789012 --store something.myshopify.com             # update
# add --allow-live when it's the published theme
```

## Restoring a backup

The backup is the client's editor files as they were just before the update (GitHub run → *Artifacts* →
`theme-editor-backup-…`, or `backup/theme-json/` locally). To put one back:
`shopify theme push --theme <id> --path <backup folder> --only config/settings_data.json --only "templates/*.json" --only "sections/*.json" --nodelete`.

## Why not upload a zip each time?

A zip contains the whole theme, including the editor files, so Shopify makes a *new* theme from it and the
client's editor work stays behind in the old one. `theme:update` instead sends the code into the same theme and
merges the editor files (`scripts/lib/theme-merge.ts`, unit tested in `tests/unit/theme-merge.test.ts`).
