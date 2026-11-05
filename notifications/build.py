"""Builds the branded Shopify notification templates in this folder.

Each output file is self-contained HTML + Liquid, ready to paste into
Shopify admin → Settings → Notifications → (template) → Edit code.
Run:  python3 notifications/build.py
Shared header/footer live here so every email stays consistent.
"""
from pathlib import Path

NAVY, GOLD, YELLOW, INK, MUTED, PAPER = '#0B1F3A', '#C9A227', '#FFD60A', '#16181D', '#5D6470', '#F7F7F5'
ADDRESS = 'Unit M10, Stanley Meat Market, Prescot Road, Liverpool, L13 3AS'
PHONE = '07344 670317'

HEAD = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{{{ email_title }}}}</title>
</head>
<body style="margin:0;padding:0;background:{PAPER};font-family:Inter,Arial,Helvetica,sans-serif;color:{INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAPER};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="background:{NAVY};padding:20px 28px;border-bottom:4px solid {GOLD};">
          {{%- if shop.email_logo_url -%}}
            <img src="{{{{ shop.email_logo_url }}}}" alt="GBG Bargain Shop" width="{{{{ shop.email_logo_width | default: 150 }}}}" style="display:block;border:0;max-width:200px;height:auto;">
          {{%- else -%}}
            <span style="display:inline-block;background:{GOLD};color:{NAVY};font:800 20px Arial,sans-serif;padding:6px 8px;border-radius:4px;">GBG</span>
            <span style="color:#ffffff;font:700 18px Arial,sans-serif;padding-left:6px;">Bargain Shop</span>
          {{%- endif -%}}
        </td></tr>
        <tr><td style="padding:28px;">
'''

FOOT = f'''
        </td></tr>
        <tr><td style="background:{NAVY};color:#DCE3EE;padding:22px 28px;font-size:13px;line-height:1.6;">
          <strong style="color:#ffffff;">GBG Bargain Shop</strong><br>
          {ADDRESS}<br>
          Phone <a href="tel:+447344670317" style="color:#ffffff;">{PHONE}</a>
          {{%- if shop.email %}} · <a href="mailto:{{{{ shop.email }}}}" style="color:#ffffff;">{{{{ shop.email }}}}</a>{{% endif %}}<br>
          <a href="{{{{ shop.url }}}}" style="color:{YELLOW};">gbgbargainshop.co.uk</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
'''

H1 = f'style="margin:0 0 12px;font:800 26px/1.15 Arial,Helvetica,sans-serif;color:{NAVY};"'
P = f'style="margin:0 0 16px;font-size:16px;line-height:1.55;color:{INK};"'
BTN = f'style="display:inline-block;background:{NAVY};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px;font-size:16px;"'
NOTE = f'style="margin:0 0 16px;padding:14px 16px;background:#F3E7C1;border-left:4px solid {GOLD};border-radius:6px;font-size:15px;line-height:1.5;color:{INK};"'

LINES = f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-top:1px solid #E3E5EA;">
  {{%- for line in {{collection}} -%}}
  <tr>
    <td width="72" style="padding:12px 0;border-bottom:1px solid #E3E5EA;">
      {{%- if line.image -%}}<img src="{{{{ line | img_url: 'compact_cropped' }}}}" alt="" width="60" height="60" style="display:block;border:1px solid #E3E5EA;border-radius:6px;">{{%- endif -%}}
    </td>
    <td style="padding:12px 8px;border-bottom:1px solid #E3E5EA;font-size:15px;line-height:1.4;">
      {{{{ line.title }}}}{{% if line.quantity > 1 %}} × {{{{ line.quantity }}}}{{% endif %}}
      {{%- if line.variant_title != blank and line.variant_title != 'Default Title' -%}}<br><span style="color:{MUTED};font-size:13px;">{{{{ line.variant_title }}}}</span>{{%- endif -%}}
    </td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid #E3E5EA;font:800 16px Arial,sans-serif;color:{NAVY};white-space:nowrap;">{{{{ line.final_line_price | money }}}}</td>
  </tr>
  {{%- endfor -%}}
</table>
'''

def lines(collection):
    return LINES.replace('{collection}', collection)

TOTALS = f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin-bottom:20px;">
  <tr><td style="padding:4px 0;color:{MUTED};">Subtotal</td><td align="right">{{{{ subtotal_price | money }}}}</td></tr>
  {{%- for discount_application in discount_applications -%}}
  <tr><td style="padding:4px 0;color:{MUTED};">Discount ({{{{ discount_application.title }}}})</td><td align="right">−{{{{ discount_application.total_allocated_amount | money }}}}</td></tr>
  {{%- endfor -%}}
  <tr><td style="padding:4px 0;color:{MUTED};">{{% if delivery_method == 'pick-up' %}}Collection{{% else %}}Delivery{{% endif %}}</td><td align="right">{{% if shipping_price == 0 %}}Free{{% else %}}{{{{ shipping_price | money }}}}{{% endif %}}</td></tr>
  {{%- if tax_price > 0 -%}}<tr><td style="padding:4px 0;color:{MUTED};">{{% if taxes_included %}}Including VAT{{% else %}}VAT{{% endif %}}</td><td align="right">{{{{ tax_price | money }}}}</td></tr>{{%- endif -%}}
  <tr><td style="padding:10px 0 0;font-weight:700;border-top:2px solid {NAVY};">Total</td><td align="right" style="padding:10px 0 0;font:800 20px Arial,sans-serif;color:{NAVY};border-top:2px solid {NAVY};">{{{{ total_price | money_with_currency }}}}</td></tr>
</table>
'''

PICKUP_ADDRESS = f'''<p {NOTE}><strong>Collect from:</strong> GBG Bargain Shop, {ADDRESS}.<br>
Bring your order number <strong>{{{{ order_name }}}}</strong> (this email on your phone is fine) and photo ID if someone else is collecting for you. [TO CONFIRM collection rules]</p>'''

T = {}

T['order_confirmation'] = (
    "{%- assign email_title = 'Thanks for your order' -%}",
    f'''<h1 {H1}>Thanks for your order, {{{{ customer.first_name | default: 'there' }}}}!</h1>
<p {P}>Order <strong>{{{{ order_name }}}}</strong> is confirmed.
{{%- if delivery_method == 'pick-up' %}} We'll email you when it's ready to collect from our Liverpool shop.{{% else %}} We'll email you when it's on its way.{{% endif -%}}</p>
{{%- if delivery_method == 'pick-up' -%}}{PICKUP_ADDRESS}{{%- endif -%}}
<p style="margin:0 0 24px;"><a href="{{{{ order_status_url }}}}" {BTN}>View your order</a></p>
{lines('subtotal_line_items')}
{TOTALS}
{{%- if shipping_address and delivery_method != 'pick-up' -%}}
<p {P}><strong>Delivery address</strong><br>{{{{ shipping_address | format_address }}}}</p>
{{%- endif -%}}
<p style="margin:0;font-size:14px;color:{MUTED};line-height:1.5;">Changed your mind? You can cancel an online order within 14 days of receiving it – see our <a href="{{{{ shop.url }}}}/policies/refund-policy" style="color:{NAVY};">returns policy</a>. Your statutory rights are not affected.</p>'''
)

T['pickup_ready'] = (
    "{%- assign email_title = 'Your order is ready to collect' -%}",
    f'''<h1 {H1}>Your order is ready to collect</h1>
<p {P}>Good news, {{{{ customer.first_name | default: 'there' }}}} – order <strong>{{{{ order_name }}}}</strong> is waiting for you at the shop.</p>
<p {NOTE}><strong>Where:</strong> GBG Bargain Shop, {ADDRESS} (inside Stanley Meat Market).<br>
<strong>When:</strong> during our opening hours [TO CONFIRM hours] – please collect within [TO CONFIRM] days.<br>
<strong>Bring:</strong> your order number <strong>{{{{ order_name }}}}</strong> (this email is fine) and photo ID if someone is collecting for you.</p>
{{%- if pickup_instructions != blank -%}}<p {P}>{{{{ pickup_instructions }}}}</p>{{%- endif -%}}
<p style="margin:0 0 24px;"><a href="https://www.google.com/maps/dir/?api=1&destination=Stanley%20Meat%20Market%2C%20Prescot%20Road%2C%20Liverpool%20L13%203AS" {BTN}>Get directions</a></p>
{lines('line_items')}
<p style="margin:0;font-size:14px;color:{MUTED};">Questions? Call {PHONE}.</p>'''
)

T['shipping_confirmation'] = (
    "{%- assign email_title = 'Your order is on its way' -%}",
    f'''<h1 {H1}>Your order is on its way</h1>
<p {P}>Order <strong>{{{{ order_name }}}}</strong> has been sent{{% if fulfillment.tracking_company %}} with {{{{ fulfillment.tracking_company }}}}{{% endif %}}.</p>
{{%- if fulfillment.tracking_numbers.size > 0 -%}}
<p {P}>Tracking number: <strong>{{{{ fulfillment.tracking_numbers | join: ', ' }}}}</strong></p>
<p style="margin:0 0 24px;"><a href="{{{{ fulfillment.tracking_urls.first | default: order_status_url }}}}" {BTN}>Track your parcel</a></p>
{{%- else -%}}
<p style="margin:0 0 24px;"><a href="{{{{ order_status_url }}}}" {BTN}>View your order</a></p>
{{%- endif -%}}
{lines('fulfillment.fulfillment_line_items')}
<p style="margin:0;font-size:14px;color:{MUTED};">If anything isn't right when it arrives, call {PHONE} – your statutory rights always apply.</p>'''
)
# fulfillment_line_items have .line_item; use a dedicated loop
T['shipping_confirmation'] = (T['shipping_confirmation'][0], T['shipping_confirmation'][1].replace(lines('fulfillment.fulfillment_line_items'), f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-top:1px solid #E3E5EA;">
  {{%- for item in fulfillment.fulfillment_line_items -%}}
  <tr><td style="padding:12px 0;border-bottom:1px solid #E3E5EA;font-size:15px;">{{{{ item.line_item.title }}}} × {{{{ item.quantity }}}}</td></tr>
  {{%- endfor -%}}
</table>'''))

T['shipping_update'] = (
    "{%- assign email_title = 'Update on your delivery' -%}",
    f'''<h1 {H1}>An update on your delivery</h1>
<p {P}>The tracking details for order <strong>{{{{ order_name }}}}</strong> have changed.</p>
{{%- if fulfillment.tracking_numbers.size > 0 -%}}<p {P}>New tracking number: <strong>{{{{ fulfillment.tracking_numbers | join: ', ' }}}}</strong></p>{{%- endif -%}}
<p style="margin:0 0 24px;"><a href="{{{{ fulfillment.tracking_urls.first | default: order_status_url }}}}" {BTN}>Track your parcel</a></p>
<p style="margin:0;font-size:14px;color:{MUTED};">Questions? Call {PHONE}.</p>'''
)

T['refund'] = (
    "{%- assign email_title = 'Your refund' -%}",
    f'''<h1 {H1}>We've refunded you</h1>
<p {P}>We've refunded <strong>{{{{ amount | money }}}}</strong> for order <strong>{{{{ order_name }}}}</strong> to your original payment method.
It can take 3–10 working days to show on your statement, depending on your bank.</p>
{{%- if refund_line_items.size > 0 -%}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-top:1px solid #E3E5EA;">
  {{%- for item in refund_line_items -%}}
  <tr><td style="padding:12px 0;border-bottom:1px solid #E3E5EA;font-size:15px;">{{{{ item.line_item.title }}}} × {{{{ item.quantity }}}}</td></tr>
  {{%- endfor -%}}
</table>
{{%- endif -%}}
<p style="margin:0 0 24px;"><a href="{{{{ order_status_url }}}}" {BTN}>View your order</a></p>
<p style="margin:0;font-size:14px;color:{MUTED};">Questions about your refund? Call {PHONE}.</p>'''
)

T['abandoned_checkout'] = (
    "{%- assign email_title = 'You left something in your basket' -%}",
    f'''<h1 {H1}>Still thinking it over?</h1>
<p {P}>You left these in your basket at GBG Bargain Shop. Many of our bargains are one-offs, so we can't hold them – but they're still there if you'd like them.</p>
{lines('line_items')}
<p style="margin:0 0 24px;"><a href="{{{{ url }}}}" {BTN}>Return to your basket</a></p>
<p style="margin:0;font-size:14px;color:{MUTED};">You're receiving this because you started a checkout and agreed to receive emails. Don't want these? Use the unsubscribe link below.</p>'''
)

T['customer_account_activate'] = (
    "{%- assign email_title = 'Activate your account' -%}",
    f'''<h1 {H1}>Activate your GBG account</h1>
<p {P}>Hi {{{{ customer.first_name | default: 'there' }}}}, an account has been created for you. Choose a password to start tracking your orders.</p>
<p style="margin:0 0 24px;"><a href="{{{{ customer.account_activation_url }}}}" {BTN}>Activate account</a></p>
<p style="margin:0;font-size:14px;color:{MUTED};">If you didn't ask for this, you can ignore this email.</p>'''
)

T['customer_account_welcome'] = (
    "{%- assign email_title = 'Welcome to GBG Bargain Shop' -%}",
    f'''<h1 {H1}>Welcome to GBG Bargain Shop</h1>
<p {P}>Thanks for creating an account, {{{{ customer.first_name | default: 'there' }}}}. You can now check out faster and see your orders in one place.</p>
<p style="margin:0 0 24px;"><a href="{{{{ shop.url }}}}/collections/new-arrivals" {BTN}>See what's new</a></p>
<p {NOTE}>Prefer to browse in person? Visit us at {ADDRESS}.</p>'''
)

T['customer_password_reset'] = (
    "{%- assign email_title = 'Reset your password' -%}",
    f'''<h1 {H1}>Reset your password</h1>
<p {P}>Click below to choose a new password for your GBG Bargain Shop account. The link expires after a while for your security.</p>
<p style="margin:0 0 24px;"><a href="{{{{ customer.reset_password_url }}}}" {BTN}>Reset password</a></p>
<p style="margin:0;font-size:14px;color:{MUTED};">If you didn't ask to reset your password, ignore this email – your account is safe.</p>'''
)

here = Path(__file__).parent
for name, (assign, body) in T.items():
    (here / f'{name}.liquid').write_text(f'{assign}\n{HEAD}{body}\n{FOOT}')
    print('wrote', name)
