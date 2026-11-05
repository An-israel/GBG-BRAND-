# Handover pack

## Theme version and code
| Item | Value |
|---|---|
| Theme | GBG Bargain Shop **v1.0.0** (Online Store 2.0, custom; Dawn-style web components, no jQuery) |
| Git repository | `an-israel/gbg-brand-` (theme in `theme/`, scripts in `scripts/`) |
| Release tags | `v1.0.0` and up – see CHANGELOG.md |
| Live theme ID | [fill in at launch] |
| Previous theme (rollback) | "DBS backup – do not delete – <date>" [fill in] |
| Admin API version used by scripts | 2026-10 (review each April) |

## Apps and recurring costs (#88)
Prefer built-in Shopify features. **No paid third-party app is needed for launch.** Any new app must be listed here with its monthly cost and approved by the owner first.

| App / service | Purpose | Monthly cost | Owner approval |
|---|---|---|---|
| Shopify plan | Store, checkout, hosting | [TO CONFIRM current plan] | Existing |
| Shopify Search & Discovery | Filters, synonyms | Free (by Shopify) | Needed |
| Shopify POS (if chosen) | In-store sales, shared stock | POS Lite free; POS Pro extra per location [check current price] | ⚠ |
| Card reader (if POS) | In-store card payments | One-off hardware [check current price] | ⚠ |
| Google & YouTube app **or** custom GA4 pixel | Analytics | Free | Needed |
| Uptime monitor (e.g. UptimeRobot free) | Site-down/SSL alerts | Free tier | Needed |
| Domain `gbgbargainshop.co.uk` | Web address | [registrar price / year] | Owner |
| Apps already installed on the DBS store | from `backup/<date>/MANUAL.md` | [list] | Review: keep / remove |

## Integration ownership
| Integration | Account owner | Login held by | Notes |
|---|---|---|---|
| Shopify store | Owner | Owner (+ collaborator access for developer) | Owner keeps ownership |
| Shopify Payments / payouts | Owner | Owner only | |
| Domain registrar | Owner | Owner | Developer never holds the login |
| Google Analytics 4 / Search Console / Business Profile | Owner's Google account | Owner (+ developer as user) | |
| Meta / TikTok (if used) | Owner | Owner | |
| GitHub repository | [TO CONFIRM] | Owner + developer | Secrets: SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLI_THEME_TOKEN, STOREFRONT_PASSWORD |
| Custom app "GBG scripts" | Store | Store owner can revoke | Scopes listed in STORE_SETUP_CHECKLIST §1 |

## DNS and domain
See STORE_SETUP_CHECKLIST §11 for the exact records (A, CNAME www, SPF, DKIM, DMARC). Record the final values and the registrar here at launch.

## Who owns what
| Area | Owner | Developer | Shop staff |
|---|---|---|---|
| Prices, products, approvals | ✔ | | prepares |
| Orders, pickups, refunds | ✔ (refunds) | | ✔ |
| Theme content (banners, copy) | ✔ | helps | |
| Theme code, scripts, CI | | ✔ | |
| Legal pages | ✔ (with legal advice) | implements | |
| Domain, payments, ownership | ✔ | | |

## Documents
README · INSTALL_ON_SHOPIFY · ADMIN_GUIDE · STAFF_SOP · PRODUCT_CSV_GUIDE · STORE_SETUP_CHECKLIST · ACCEPTANCE_TESTS ·
ENGINEERING · RUNBOOK · TRAINING_SCRIPT · DESIGN_REVIEW · DBS_AUDIT · MARKETING_CONSENT · P2_ESTIMATES · TO_CONFIRM.

## Post-launch support (§16.4) [TO CONFIRM with owner]
| Item | Proposal |
|---|---|
| Support period | [e.g. 30 days after launch] |
| Bug response | Site down / checkout broken: same day · Other bugs: [e.g. 2 working days] |
| Included | Fixing defects in delivered work |
| Chargeable | New features, new sections/templates, extra catalogue uploads, P2 items, third-party app setup |
