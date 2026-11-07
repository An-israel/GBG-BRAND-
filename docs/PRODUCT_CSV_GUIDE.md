# How to fill the product spreadsheet

Use `templates/gbg_products_template.csv` (open in Google Sheets or Excel, **save as CSV**). The first rows
are filled examples – copy their style, then delete them. The format is Shopify's own product CSV, so it
can also be imported in Shopify admin if needed.

| Column | What to write | Example |
|---|---|---|
| **Handle** | The web address of the item: lower-case words joined by hyphens. Unique per product. Variant rows repeat it. | `tan-faux-leather-tote-bag` |
| **Title** | What it is: colour + material + type + key detail. 10–70 characters (max 120). No "DBS", no "genuine/designer" unless proven. | `Tan faux-leather tote bag with gold clasp` |
| **Body (HTML)** | 1–3 sentences from the actual item. Wrap in `<p>…</p>`. | `<p>Roomy tote, inside zip pocket. Fits A4.</p>` |
| **Vendor** | `GBG Bargain Shop` unless the brand is certain. | |
| **Type** | Simple product type. | `Handbag` |
| **Tags** | Comma-separated. **At least one category tag** (below). Add `new-arrival` for new stock, `clearance` / `last-chance` / `best-bargain` when true. | `bags, handbags, new-arrival` |
| **Option1 / Option2 / Option3 Name and Value** | Only for identical items in several sizes/colours. Names go on the product's first row (e.g. Option1 Name `Size`, Option2 Name `Colour`); every row then fills the values (`5` / `Black`). Each row must be a different combination. Items without options: `Title` / `Default Title`. | |
| **Variant SKU** | The SKU on the label. Unique. | `GBG-BAG-0001` |
| **Variant Grams** | Weight with packaging, in grams. Required. | `650` |
| **Variant Inventory Qty** | How many you have. One-off item = `1`. | `1` |
| **Variant Inventory Policy** | Always `deny`. | `deny` |
| **Variant Price** | Selling price with a **dot** for pence (`12.99`, not `12,99`). A £ sign is fine. | `12.99` |
| **Variant Compare At Price** | **Only** a genuine, provable previous price. Must be higher than Price. Otherwise empty. | |
| **Cost per item** | What we paid (internal only). | `5.00` |
| **Status** | `draft` until the owner approves; then `active`. | `draft` |
| **Condition** | One of: `New`, `New with tags`, `Open box`, `Customer return`, `Used`, `Unchecked` (capital letters are fixed automatically). | `New with tags` |
| **Condition notes** | Faults, missing parts, wear. Required in practice for Open box / Customer return / Used / Unchecked. | `Small mark on the lining.` |
| **Dimensions** | Size or measurements. | `38 x 30 x 14 cm` |
| **Colour** | The main colour in one or two words. Used for the colour filter and photo alt text. Expected for bags, shoes and clothing. | `Tan` |
| **Collection only** | `TRUE` for bulky items that can't be posted. Otherwise `FALSE`. | `FALSE` |
| **Tested** | Electricals: `Tested working` / `Untested`. Others: `Not applicable`. | `Tested working` |
| **Internal notes** | Staff only – never shown. Shelf, pallet, supplier. | `Shelf B2` |
| SEO Title / SEO Description | Optional. Up to 70 / 160 characters. | |

**Category tags:** `bags`, `handbags`, `backpacks`, `purses`, `travel`, `shoes`, `womens-shoes`, `mens-shoes`, `kids-shoes`,
`jewellery`, `earrings`, `necklaces`, `bracelets`, `watches`, `fashion`, `womens-fashion`, `mens-fashion`, `kids-fashion`,
`home`, `cookware`, `storage`, `household`, `electronics`, `speakers`, `small-electronics`, `tech-accessories`, `beauty`.
Use the main tag **and** the sub-tag (e.g. `bags, handbags`).

## Check it

```bash
npm run images   -- --csv products.csv          # prepares photos from photos/<SKU>/
npm run validate -- products.csv --photos photos
```

Photos straight from an iPhone (HEIC) are fine. Photos smaller than 800 px get a warning – retake them if you can.

The report lists every problem with the row number and what to do. Fix all **ERROR** lines; read the **WARNING** lines.
Then follow STAFF_SOP step 5.
