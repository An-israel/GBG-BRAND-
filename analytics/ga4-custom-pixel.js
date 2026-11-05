/**
 * GBG Bargain Shop – GA4 custom pixel with Google Consent Mode v2.
 *
 * Paste into Shopify admin → Settings → Customer events → Add custom pixel.
 * Pixel settings: Permission = "Required" for Analytics and Marketing, Data sale = "Data collected does not qualify as data sale".
 * Shopify then only runs this code AFTER the visitor accepts the relevant cookies in the
 * Shopify cookie banner (Settings → Customer privacy), so nothing fires before consent.
 *
 * Alternative: the "Google & YouTube" app also supports consent. Use ONE of the two, never both
 * (double counting). Replace G-XXXXXXXXXX with the GA4 measurement ID [TO CONFIRM].
 */
const MEASUREMENT_ID = 'G-XXXXXXXXXX';

// Consent Mode v2 defaults: denied until the customer privacy API says otherwise.
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500,
});

function updateConsent(c) {
  gtag('consent', 'update', {
    analytics_storage: c.analyticsProcessingAllowed ? 'granted' : 'denied',
    ad_storage: c.marketingAllowed ? 'granted' : 'denied',
    ad_user_data: c.marketingAllowed ? 'granted' : 'denied',
    ad_personalization: c.marketingAllowed ? 'granted' : 'denied',
  });
}
updateConsent(init.customerPrivacy || {});
api.customerPrivacy.subscribe('visitorConsentCollected', (e) => updateConsent(e.customerPrivacy));

const script = document.createElement('script');
script.async = true;
script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
document.head.appendChild(script);
gtag('js', new Date());
// Exclude internal traffic: add your shop's IP as "internal" in GA4 → Admin → Data streams → Define internal traffic.
gtag('config', MEASUREMENT_ID, { send_page_view: false });

const item = (v, qty = 1) => ({
  item_id: v?.sku || v?.id, item_name: v?.product?.title, item_variant: v?.title,
  item_category: v?.product?.type, price: v?.price?.amount, quantity: qty,
});
const currency = (e) => e?.data?.checkout?.currencyCode || e?.data?.cartLine?.cost?.totalAmount?.currencyCode || 'GBP';

analytics.subscribe('page_viewed', (e) => gtag('event', 'page_view', { page_location: e.context.document.location.href, page_title: e.context.document.title }));
analytics.subscribe('product_viewed', (e) => {
  const v = e.data.productVariant;
  gtag('event', 'view_item', { currency: v.price.currencyCode, value: v.price.amount, items: [item(v)] });
});
analytics.subscribe('collection_viewed', (e) => {
  const c = e.data.collection;
  gtag('event', 'view_item_list', { item_list_id: c.id, item_list_name: c.title, items: (c.productVariants || []).slice(0, 20).map((v) => item(v)) });
});
analytics.subscribe('search_submitted', (e) => gtag('event', 'search', { search_term: e.data.searchResult.query }));
analytics.subscribe('product_added_to_cart', (e) => {
  const l = e.data.cartLine;
  gtag('event', 'add_to_cart', { currency: l.cost.totalAmount.currencyCode, value: l.cost.totalAmount.amount, items: [item(l.merchandise, l.quantity)] });
});
analytics.subscribe('checkout_started', (e) => {
  const c = e.data.checkout;
  gtag('event', 'begin_checkout', { currency: currency(e), value: c.totalPrice?.amount, items: c.lineItems.map((l) => item(l.variant, l.quantity)) });
});
analytics.subscribe('checkout_shipping_info_submitted', (e) => {
  const c = e.data.checkout;
  const pickup = (c.delivery?.selectedDeliveryOptions || []).some((o) => /pick/i.test(o.type || o.title || ''));
  gtag('event', pickup ? 'select_pickup' : 'add_shipping_info', { currency: currency(e), value: c.totalPrice?.amount });
});
analytics.subscribe('checkout_completed', (e) => {
  const c = e.data.checkout;
  if (/test/i.test(c.order?.id || '') || c.email?.endsWith('@gbgbargainshop.co.uk')) return; // keep staff test orders out
  gtag('event', 'purchase', {
    transaction_id: c.order?.id, currency: currency(e), value: c.totalPrice?.amount, tax: c.totalTax?.amount, shipping: c.shippingLine?.price?.amount,
    items: c.lineItems.map((l) => item(l.variant, l.quantity)),
  });
});
// Custom events published by the theme (theme.js → Shopify.analytics.publish)
['whatsapp_click', 'contact', 'directions_click'].forEach((name) => {
  analytics.subscribe(name, (e) => gtag('event', name, { link_url: e.customData?.href, page_path: e.customData?.page }));
});
