# DBS audit

**Not run yet** – needs store access. Run `npm run audit:dbs` (read-only) once the custom app token is in `.env`.
It replaces this file with every place "DBS", "DBS Accessories" or "GBG Wholesale Hub" appears in products,
collections, pages, articles, menus, redirects and store details – each with a suggested action
(**update / archive / delete / keep**) – plus a manual checklist for apps, email automations, notification
templates, checkout branding, social/Meta integrations, the favicon, store name and sender email.

The new theme, emails and content in this repository contain no DBS wording; CI fails the build if any appears.
