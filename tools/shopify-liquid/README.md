# Header menu check with Shopify's own Liquid engine

The offline preview (`tools/preview`) uses liquidjs, which can hide differences from Shopify.
This renders `sections/header.liquid` + `snippets/nav-tree.liquid` with the open-source Ruby
`liquid` gem (the engine Shopify is built on) in four store situations, including one where looping
over the store's collections raises an error.

```bash
gem install liquid
ruby tools/shopify-liquid/header_menu.rb
```

Expected:
```
empty store                                TOP MENU: ["Shop", "Visit Us"]
store with products, no GBG collections    TOP MENU: ["Shop", "New Arrivals", "Visit Us"]
store where looping collections errors     TOP MENU: ["Shop", "Visit Us"]
set-up store                               TOP MENU: ["Shop", "New Arrivals", "Clearance", "Visit Us"]
```
