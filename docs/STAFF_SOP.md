# Staff process – from delivery to sale (print this page)

**Receive → Inspect → Label → Photograph → Upload → Approve → Display → Sell → Reconcile weekly**

| # | Step | Who | How | Done looks like |
|---|---|---|---|---|
| 1 | **Receive** | Shop staff | Count the stock against the delivery note. Put online candidates in the "To list" crate. | Count matches; crate labelled with date. |
| 2 | **Inspect** | Shop staff | Check every item: works? complete? marks or damage? Electricals: power on, test every function, check the plug and cable. Choose ONE condition: New · New with tags · Open box · Customer return · Used · Unchecked. | Condition chosen; faults written down. Unsafe electricals are **not** listed. |
| 3 | **Label** | Shop staff | Give each item the next SKU (e.g. `GBG-BAG-0123`; one SKU per item, or per size/colour of identical items). Print/stick the SKU label. Weigh it with packaging (grams). | Label on the item; weight noted. |
| 4 | **Photograph** | Photo corner | White background, good light. 1) front – fills the frame, 2–5) side, back, inside/label, **every fault close-up**. Save into a folder named **exactly the SKU** (`photos/GBG-BAG-0123/`). | 4–6 sharp photos in the SKU folder. |
| 5 | **Upload** | Lister | Fill one CSV row per item (see PRODUCT_CSV_GUIDE.md), Status = `draft`. Run `npm run images`, then `npm run validate -- products.csv --photos photos`. Fix every ERROR. Run the import. | Validator says 0 errors; product appears in Shopify as a **draft**. |
| 6 | **Approve** | Owner / manager | In Shopify → Products → Drafts: check title, price, condition, photos, faults. Change Status to **Active** (or set `active` in the CSV and re-import). | Product is Active and visible online. |
| 7 | **Display** | Shop staff | Put the item on the shelf / online-stock area with the SKU label visible. | Findable in under a minute by SKU. |
| 8 | **Sell** | Everyone | **With Shopify POS:** scan/search the SKU – stock updates online automatically. **Without POS:** straight after the sale, Shopify app → Products → item → Inventory → reduce by 1. Online orders: pick, pack (or set aside for pickup), mark fulfilled / ready for pickup **the same day**. | Online stock always matches the shelf. |
| 9 | **Reconcile weekly** | Manager (Monday) | Run `npm run report:weekly`. Spot-check 10 random SKUs shelf vs Shopify. Remove sold-out items from featured collections. Clear New Arrival tags older than 30 days. | Report saved; differences corrected. |

**Never:** list an item without a condition · invent a "was" price · write "no refunds" · write "genuine/designer" unless proven · post a bulky item (set *Collection only*) · use the old DBS name.
