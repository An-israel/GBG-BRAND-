# Runbook – when something goes wrong

Stay calm, follow the steps, write down what you did (time + action). Afterwards fill in the postmortem template at the bottom.

## On-call (#110) [TO CONFIRM names and numbers]

| Role | Name | Phone | When |
|---|---|---|---|
| Owner (decisions, payments, domain) | [TO CONFIRM] | [TO CONFIRM] | Always for payments/domain |
| Shop manager (orders, stock) | [TO CONFIRM] | [TO CONFIRM] | Shop hours |
| Developer (theme, scripts) | [TO CONFIRM] | [TO CONFIRM] | Per support terms in HANDOVER |
| Shopify Support | help.shopify.com → Contact | 24/7 chat | Platform problems |

First check **shopifystatus.com** – if Shopify itself is down, there is nothing to fix on our side; post a note on social media.

## Playbooks (#109)

### Site down / not loading
1. Open the site on mobile data (not shop Wi-Fi). Check shopifystatus.com.
2. Online Store → Themes: is the GBG theme still published? Is a storefront password on (Preferences)?
3. Domain: Settings → Domains – any red warning? If the domain or SSL expired, the **owner** renews at the registrar.
4. A theme change broke it → **rollback**: Online Store → Themes → previous theme → **Publish** (takes seconds), then fix on an unpublished copy.

### Checkout failing
1. Try a test order yourself. Read the error.
2. Settings → Payments: any verification or payout hold message? (Owner deals with Shopify Payments.)
3. Bogus Gateway accidentally left on? Turn it off.
4. Recently installed app? Disable it and retest.
5. Contact Shopify Support with the time and the error text.

### Wrong price live
1. Products → find it → fix the price → Save (live in seconds).
2. If orders were placed at the wrong price: the owner decides – honour it, or contact the customer and cancel/refund **before** dispatch (UK law allows cancelling clear pricing errors).
3. If it came from an import: fix the CSV, then re-run the import for that row.

### Oversold item (sold online and in the shop)
1. Contact the online customer at once, apologise, refund in full (Orders → Refund).
2. Check: was the in-store sale put through POS / adjusted straight away? Retrain on STAFF_SOP step 8.
3. Check the product's *Continue selling when out of stock* is **off**.

### "DBS" branding found
1. Note where (page, email, receipt, product). Fix it straight away (Pages / Products / Settings → Notifications).
2. Run `npm run audit:dbs` and `npm run smoke` to find any others.
3. Add the place to the DBS_AUDIT checklist so it is not missed again.

### Payment issue (payouts held, chargebacks, suspected fraud)
1. Owner only: Settings → Payments → Shopify Payments → view details.
2. Fraud: don't fulfil high-risk orders until checked; cancel and refund if in doubt.
3. Chargeback: respond in Shopify with proof (order, tracking/pickup sign-off) before the deadline.

## Secrets (#67)
- The Admin API token lives only in `.env` (developer laptop) and GitHub → Settings → Secrets.
- **Rotate** every 6 months or when someone leaves: Settings → Apps → Develop apps → GBG scripts → API credentials → **Uninstall** and reinstall → new token → update `.env` and the GitHub secret.
- Never paste tokens or passwords in chat, email, tickets or code.

## Admin API version (#102)
Scripts pin `API_VERSION` in `scripts/lib/config.ts` (currently `2026-10`). Shopify supports each version ~12 months.
Each April: bump the version, run every script with `--dry-run`, fix any changes, commit.

## Rollback (#55)
- **Theme:** publish the previous theme (kept unpublished), or `git checkout v<previous>` → `shopify theme push --theme <id>`.
- **Products:** re-import from `backup/<date>/products.csv` or the last good CSV.
- **Menus/collections/pages:** `npm run setup:store` recreates missing structure; content from `backup/<date>/*.json`.

## Monitoring (#58, #62)
- Uptime monitor (e.g. UptimeRobot free plan – **needs owner approval**) on `https://www.gbgbargainshop.co.uk`, 5-minute checks, SSL-expiry alert, alerts to [TO CONFIRM owner email].
- GitHub emails CI failures and the weekly job failures to repository admins.

---

## Postmortem template (#111) – blameless

```
Title:
Date / time started – detected – fixed:
Who was involved:
What customers saw:
Impact (orders affected, money, duration):
Timeline (time – what happened – what we did):
Root cause (the system/process, not a person):
What went well:
What we'll change (action – owner – due date):
```
