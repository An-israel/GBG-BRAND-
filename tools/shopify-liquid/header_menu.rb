Encoding.default_external = Encoding::UTF_8
Encoding.default_internal = Encoding::UTF_8
gem 'liquid', ENV['LIQUID_V'] if ENV['LIQUID_V']
require 'liquid'
require 'liquid/c' if ENV['LIQUID_C']
THEME = File.expand_path('../../theme', __dir__)
class Schema < Liquid::Block; def render(_c) = ''; end
Liquid::Environment.default.register_tag('schema', Schema)
module Stubs
  def image_url(i, *a) = (i.is_a?(Hash) ? i['src'] : i).to_s
  def image_tag(u, *a) = "<img src=\"#{u}\">"
  def money(c) = format('£%.2f', c.to_f / 100)
  def placeholder_svg_tag(*a) = '<svg></svg>'
  def pluralize(n, a, b) = (n.to_i == 1 ? a : b)
end
Liquid::Environment.default.register_filter(Stubs)
require_relative 'fs'; fs = SnippetFS.new("#{THEME}/snippets")

class Collections < Liquid::Drop
  def initialize(h, fail_each = false) = (@h = h; @fail = fail_each)
  def liquid_method_missing(k) = @h[k]
  def each(&b) = (@fail ? raise(Liquid::Error, "Array 'collections' is not paginated.") : @h.values.each(&b))
  def size = @h.size
  def to_liquid = self
end
include Enumerable
def coll(handle, title, n) = { 'handle' => handle, 'title' => title, 'url' => "/collections/#{handle}", 'products_count' => n, 'products' => [] }

scenarios = {
  'empty store' => {},
  'store with products, no GBG collections' => { 'all' => coll('all', 'All', 12), 'frontpage' => coll('frontpage', 'Home page', 3), 'old-dbs' => coll('old-dbs', 'Handbags', 4) },
  'store where looping collections errors' => :fail,
  'set-up store' => { 'all' => coll('all', 'All', 12), 'bags' => coll('bags', 'Bags', 4), 'handbags' => coll('handbags', 'Handbags', 2), 'new-arrivals' => coll('new-arrivals', 'New Arrivals', 3), 'clearance' => coll('clearance', 'Clearance', 2) },
}
section = { 'id' => 'header', 'settings' => { 'nav_source' => 'gbg', 'menu' => nil, 'show_quick_links' => true, 'search_placeholder' => 'Search', 'show_tagline' => true, 'tagline' => 'Big bargains. Small prices.' } }
src = File.read("#{THEME}/sections/header.liquid")
scenarios.each do |name, cols|
  assigns = {
    'section' => section, 'collections' => (cols == :fail ? Collections.new({ 'all' => coll('all', 'All', 0) }, true) : Collections.new(cols)), 'pages' => {}, 'linklists' => {},
    'routes' => { 'root_url' => '/', 'all_products_collection_url' => '/collections/all', 'collections_url' => '/collections', 'search_url' => '/search', 'cart_url' => '/cart', 'account_login_url' => '/account/login' },
    'settings' => { 'phone' => '07344 670317', 'phone_international' => '447344670317' },
    'shop' => { 'customer_accounts_enabled' => true }, 'request' => { 'path' => '/' }, 'cart' => { 'item_count' => 0 },
  }
  t = Liquid::Template.parse(src, environment: Liquid::Environment.default, error_mode: :lax)
  globals = assigns.reject { |k, _| k == 'section' }
  ctx = Liquid::Context.build(static_environments: [globals], outer_scope: { 'section' => section }, registers: { file_system: fs }, rethrow_errors: false)
  html = t.render(ctx)
  nav = html[/<nav class="header__nav".*?<\/nav>/m] || ''
  top = nav.scan(/class="nav__link[^"]*"[^>]*>([^<]+)/).flatten.map(&:strip)
  errs = html.scan(/Liquid (?:syntax )?error[^<]*/).uniq
  note = html[/Menu note[^<]*/]
  puts "#{name.ljust(42)} TOP MENU: #{top.inspect} #{errs.empty? ? '' : 'ERRORS: ' + errs.inspect} #{note}"
end
