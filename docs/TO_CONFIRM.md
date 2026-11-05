# Owner questions – collect these in one go

Everything marked `[TO CONFIRM]` in the brief, the theme and the docs. Until each is answered, the site
shows nothing (or a neutral fallback) rather than a guess.

| # | Question | Where it is used | Answer |
|---|---|---|---|
| 1 | **Store access:** collaborator invite to the existing DBS Accessories Shopify store (permissions listed in STORE_SETUP_CHECKLIST §0)? | Everything | |
| 2 | **Domain:** is `gbgbargainshop.co.uk` registered? Who is the registrar and who has the login? | DNS, launch | |
| 3 | **Logo files:** latest GBG logo – transparent PNG and SVG/vector? Favicon version? | Header, emails, favicon, social image | |
| 4 | **Opening hours** of the shop (not the warehouse), including Sundays/bank holidays | Footer, Visit Us, FAQ, Google data | |
| 5 | **Collection readiness:** how soon after ordering is a pickup order ready? How long will you hold it? What must the collector bring (order number, ID)? Exact spot to collect inside the market? | Pickup settings, emails, Click & Collect page | |
| 6 | **Business email** for customers and the sender address for order emails | Footer, contact, emails, DNS | |
| 7 | **Legal entity:** trading name vs legal name (sole trader / Ltd), company number, registered office, return address | Footer ©, policies, Terms | |
| 8 | **VAT:** registered? VAT number? | Tax settings, prices, receipts, footer | |
| 9 | **Shopify Payments:** is the account verified (bank + ID)? Want Shop Pay / Apple Pay / Google Pay? | Checkout | |
| 10 | **Delivery:** carrier, weight bands and prices, dispatch time, excluded areas (Highlands, NI…), any free-delivery threshold | Shipping profile, Delivery page | |
| 11 | **Bulky items:** which product types are collection-only or enquiry-only? | Collection only profile | |
| 12 | **POS:** will Shopify POS process *all* in-store sales? Which device and card reader? Staff names for PINs | Stock control | |
| 13 | **Initial product list:** the 50–100 launch items, stock counts, prices and **launch date** | Catalogue import | |
| 14 | **Social links:** exact Instagram, TikTok, Facebook URLs. Does 07344 670317 use **WhatsApp Business**? | Footer, product pages | |
| 15 | **Reply-time promise**, e.g. "We reply within 1 working day" | Contact page | |
| 16 | **Pricing policy:** are online prices the same as in the shop? | FAQ | |
| 17 | **In-store returns:** any goodwill change-of-mind policy beyond the law? | Refund policy | |
| 18 | **Marketing list:** are there existing DBS email subscribers, and what did they agree to? | MARKETING_CONSENT.md | |
| 19 | **Analytics:** GA4 property? Meta/TikTok pixels wanted? | Cookie policy, pixels | |
| 20 | **Owner alert email** for uptime/SSL alerts; **on-call** names and phone numbers | RUNBOOK | |
| 21 | **Support terms after launch:** support period, bug response times, what changes are chargeable | HANDOVER | |
| 22 | **Google Maps:** exact pin / latitude & longitude of Unit M10, parking and bus info | Visit Us, structured data | |
| 23 | **Approval of colour tokens** (DESIGN_REVIEW.md) and all `[FOR APPROVAL]` copy | Theme | |

## Plan (summary for the owner)

1. **Discovery & backup** – access, full backup, DBS audit, app/cost list. *(scripts ready: `npm run backup`, `npm run audit:dbs`)*
2. **Foundation** – theme installed as an **unpublished** theme; metafields, location, collections and menus by script.
3. **Design checkpoint** – owner reviews screenshots/preview and wording → approve. *(this delivery)*
4. **Catalogue** – staff fill the CSV + photos → validator → **10 sample drafts** → owner approves in Shopify.
5. **Pages, policies, structured data** – drafts in `content/` → owner/legal approval.
6. **Commerce** – payments, delivery, pickup, tax, emails, consent, POS.
7. **Full import** – the approved 50–100 listings, active with stock.
8. **QA** – Playwright, accessibility, Lighthouse, real-device and test orders.
9. **Launch** – owner's written approval → publish, domain, redirects, Search Console, monitoring.
10. **Handover** – docs, training, runbook.
