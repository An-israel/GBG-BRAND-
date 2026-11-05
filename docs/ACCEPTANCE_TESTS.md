# Acceptance tests – owner sign-off required

Record evidence for every line (screenshot file in `docs/evidence/`, order number, or test run link).
Launch only when every box is ticked and signed.

| ☐ | Area | Test | Evidence | Pass? |
|---|---|---|---|---|
| ☐ | **Brand** | No DBS Accessories name, logo, contacts or old automated messages on public pages, emails or receipts. `npx playwright test` (crawler) + `npm run audit:dbs` + test emails. | | |
| ☐ | **Navigation** | Every menu item, category tile, filter and search leads to a non-empty, relevant page (Playwright "empty collections" test against preview). | | |
| ☐ | **Catalogue** | 50–100 approved listings (or owner-approved smaller set), each with correct price, condition, SKU and stock. Weekly report shows 0 missing condition / alt text. | | |
| ☐ | **Mobile** | Home, product, menu, collection, basket and checkout work on a real **budget Android** and an **iPhone** (note models). Record LCP from PageSpeed Insights (#91, #93). | | |
| ☐ | **Checkout** | Successful card order (Bogus Gateway, then one real low-value order refunded). Tax, address, delivery price and confirmation email checked. Declined card shows a clear error. | Order #: | |
| ☐ | **Pickup** | Pickup offered only at Unit M10; "Ready for pickup" email correct; collected with order number. | Order #: | |
| ☐ | **Inventory** | Selling the last unit in-store (agreed process) makes it unavailable online; an online sale reduces stock. Two browsers, one last item → second checkout is refused. | | |
| ☐ | **Oversized items** | Collection-only product: checkout offers pickup only, never a postal rate (also in a mixed basket). | Order #: | |
| ☐ | **Legal** | Refund, Privacy, Terms, Shipping, Cookie pages live and approved; cookie banner tested (decline → no analytics requests); trader identity and contact details accurate. | | |
| ☐ | **Tech** | SSL ✔, primary domain ✔, old URLs redirect ✔, favicon ✔, mobile load speed ✔ (Lighthouse ≥ 90 perf), analytics events seen in GA4 DebugView ✔, sitemap submitted ✔, `npm run smoke` ✔. | | |
| ☐ | **Accessibility** | Keyboard-only: menu, search, filters, add to basket, basket drawer, checkout. axe tests pass. | | |
| ☐ | **Team** | 30-minute walkthrough recorded (TRAINING_SCRIPT.md) and STAFF_SOP printed and handed over. | Link: | |

**Signed off by owner:** ______________________  **Date:** __________
