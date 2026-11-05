// Mock storefront data for the OFFLINE design preview only.
// Every product here is a clearly-labelled sample so the layout can be
// reviewed before real GBG stock is uploaded. None of it goes to Shopify.

const img = (name, alt) => ({ src: `/preview-images/${name}.svg`, alt, aspect_ratio: 1, width: 600, height: 600 });

let nextId = 1000;
function product(p) {
  const id = nextId++;
  const handle = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const media = (p.images || []).map((n, i) => ({ id: id * 10 + i, media_type: 'image', alt: `${p.title} – view ${i + 1}`, preview_image: img(n, `${p.title} – view ${i + 1}`) }));
  const qty = p.qty ?? 3;
  const variantDefaults = {
    id: id * 100, title: 'Default Title', price: p.price, compare_at_price: p.compare ?? null,
    available: qty > 0, inventory_management: 'shopify', inventory_policy: 'deny', inventory_quantity: qty,
    sku: p.sku, barcode: '', url: `/products/${handle}`, options: ['Default Title'],
  };
  const variants = p.variants
    ? p.variants.map((v, i) => ({ ...variantDefaults, id: id * 100 + i, title: v.title, options: [v.title], available: v.qty > 0, inventory_quantity: v.qty, sku: `${p.sku}-${v.title}`, url: `/products/${handle}?variant=${id * 100 + i}` }))
    : [variantDefaults];
  const first = variants.find((v) => v.available) || variants[0];
  return {
    id, handle, title: p.title, url: `/products/${handle}`,
    price: p.price, compare_at_price: p.compare ?? null, price_varies: false,
    available: variants.some((v) => v.available),
    featured_media: media[0] || null, media,
    tags: p.tags || [], vendor: 'GBG Bargain Shop', type: p.type || '',
    has_only_default_variant: !p.variants,
    selected_or_first_available_variant: first, variants,
    options_with_values: p.variants ? [{ name: 'Size', selected_value: first.title, values: p.variants.map((v) => Object.assign(new String(v.title), { available: v.qty > 0 })) }] : [],
    description: `<p>${p.description || 'Sample description written from the actual item. [FOR APPROVAL]'}</p>`,
    metafields: { custom: {
      condition: { value: p.condition || 'New' },
      condition_notes: p.notes ? { value: p.notes } : null,
      dimensions: p.dimensions ? { value: p.dimensions } : null,
      collection_only: { value: !!p.collectionOnly },
      tested: p.tested ? { value: p.tested } : null,
    } },
  };
}

export const products = [
  product({ title: 'Tan faux-leather tote bag with gold clasp', price: 1299, compare: 2499, sku: 'GBG-BAG-001', images: ['handbag', 'purse'], condition: 'New with tags', tags: ['bags', 'handbags', 'new-arrival'], dimensions: '38 x 30 x 14 cm' }),
  product({ title: 'Navy everyday backpack, 20 litre', price: 899, sku: 'GBG-BAG-002', images: ['backpack', 'handbag'], condition: 'New', tags: ['bags', 'backpacks', 'new-arrival'], qty: 1 }),
  product({ title: 'Raspberry zip-around purse', price: 450, sku: 'GBG-BAG-003', images: ['purse'], condition: 'Customer return', notes: 'Small mark on the inside lining. Zip works perfectly.', tags: ['bags', 'purses', 'under-5', 'clearance'] }),
  product({ title: "Women's white lace-up trainers", price: 1500, sku: 'GBG-SHO-001', images: ['trainers', 'heels'], condition: 'Open box', tags: ['shoes', 'womens-shoes'], variants: [{ title: '4', qty: 1 }, { title: '5', qty: 2 }, { title: '6', qty: 0 }, { title: '7', qty: 1 }] }),
  product({ title: 'Black patent court heels', price: 999, compare: 1999, sku: 'GBG-SHO-002', images: ['heels'], condition: 'New with tags', tags: ['shoes', 'womens-shoes', 'clearance'], qty: 0 }),
  product({ title: 'Gold-tone analogue watch, brown strap', price: 1199, sku: 'GBG-JEW-001', images: ['watch'], condition: 'New', tags: ['jewellery', 'watches', 'new-arrival'] }),
  product({ title: 'Blue crystal pendant necklace', price: 399, sku: 'GBG-JEW-002', images: ['necklace'], condition: 'New', tags: ['jewellery', 'necklaces', 'under-5'] }),
  product({ title: 'Gold-tone hoop earrings, 4 cm', price: 299, sku: 'GBG-JEW-003', images: ['earrings'], condition: 'New with tags', tags: ['jewellery', 'earrings', 'under-5', 'last-chance'], qty: 1 }),
  product({ title: 'Navy and gold stoneware mug', price: 250, sku: 'GBG-HOM-001', images: ['mug'], condition: 'New', tags: ['home', 'cookware', 'under-5'] }),
  product({ title: '28 cm non-stick frying pan', price: 1099, sku: 'GBG-HOM-002', images: ['pan'], condition: 'Open box', notes: 'Box is damaged. Pan is unused.', tags: ['home', 'cookware'] }),
  product({ title: '45 litre clear storage box with lid', price: 650, sku: 'GBG-HOM-003', images: ['storage'], condition: 'New', tags: ['home', 'storage'], collectionOnly: true }),
  product({ title: 'Portable Bluetooth speaker, black', price: 1499, sku: 'GBG-ELE-001', images: ['speaker'], condition: 'Customer return', tested: 'Tested working', notes: 'Light scuff on the base. Charging cable included.', tags: ['electronics', 'speakers', 'new-arrival'] }),
  product({ title: 'Yellow desk lamp with metal base', price: 799, sku: 'GBG-ELE-002', images: ['lamp'], condition: 'Unchecked', tested: 'Untested', tags: ['electronics', 'small-electronics', 'last-chance'] }),
  product({ title: 'Purple knitted winter scarf', price: 350, sku: 'GBG-FAS-001', images: ['scarf'], condition: 'New', tags: ['fashion', 'womens-fashion', 'under-5'] }),
];

const byTag = (t) => products.filter((p) => p.tags.includes(t));
function collection(handle, title, prods, description = '') {
  return {
    handle, title, url: `/collections/${handle}`, products: prods, products_count: prods.length, all_products_count: prods.length,
    description, featured_image: prods[0] ? prods[0].featured_media.preview_image : null,
    sort_by: 'manual', default_sort_by: 'manual',
    filters: [
      { label: 'Availability', type: 'list', active_values: [], values: [{ label: 'In stock', value: '1', param_name: 'filter.v.availability', count: prods.filter((p) => p.available).length, active: false }, { label: 'Out of stock', value: '0', param_name: 'filter.v.availability', count: prods.filter((p) => !p.available).length, active: false }] },
      { label: 'Price', type: 'price_range', active_values: [], min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null }, range_max: 2500, url_to_remove: `/collections/${handle}` },
      { label: 'Condition', type: 'list', active_values: [], values: ['New', 'New with tags', 'Open box', 'Customer return'].map((c) => ({ label: c, value: c, param_name: 'filter.p.m.custom.condition', count: prods.filter((p) => p.metafields.custom.condition.value === c).length, active: false })) },
    ],
  };
}

export const collections = {
  all: collection('all', 'Shop all', products),
  'bags-accessories': collection('bags-accessories', 'Bags & Accessories', byTag('bags'), '<p>Handbags, backpacks, purses and travel bags at bargain prices – every one checked and clearly labelled with its condition. [FOR APPROVAL]</p>'),
  shoes: collection('shoes', 'Shoes', byTag('shoes')),
  'jewellery-watches': collection('jewellery-watches', 'Jewellery & Watches', byTag('jewellery')),
  fashion: collection('fashion', 'Fashion', byTag('fashion')),
  'home-kitchen': collection('home-kitchen', 'Home & Kitchen', byTag('home')),
  'electronics-gadgets': collection('electronics-gadgets', 'Electronics & Gadgets', byTag('electronics')),
  'beauty-personal-care': collection('beauty-personal-care', 'Beauty & Personal Care', []),
  bargains: collection('bargains', 'Best Bargains', products.filter((p) => p.compare_at_price || p.price < 500)),
  'new-arrivals': collection('new-arrivals', 'New Arrivals', byTag('new-arrival')),
  'under-5': collection('under-5', 'Under £5', byTag('under-5')),
  clearance: collection('clearance', 'Clearance', byTag('clearance')),
  'last-chance': collection('last-chance', 'Last Chance', byTag('last-chance')),
  handbags: collection('handbags', 'Handbags', byTag('handbags')),
  backpacks: collection('backpacks', 'Backpacks', byTag('backpacks')),
  purses: collection('purses', 'Purses', byTag('purses')),
  travel: collection('travel', 'Travel', []),
  'womens-shoes': collection('womens-shoes', "Women's shoes", byTag('womens-shoes')),
  'mens-shoes': collection('mens-shoes', "Men's shoes", []),
  'kids-shoes': collection('kids-shoes', "Kids' shoes", []),
  earrings: collection('earrings', 'Earrings', byTag('earrings')),
  necklaces: collection('necklaces', 'Necklaces', byTag('necklaces')),
  bracelets: collection('bracelets', 'Bracelets', []),
  watches: collection('watches', 'Watches', byTag('watches')),
  cookware: collection('cookware', 'Cookware', byTag('cookware')),
  storage: collection('storage', 'Storage', byTag('storage')),
  speakers: collection('speakers', 'Speakers', byTag('speakers')),
};

const link = (title, url, children = [], handle) => {
  const m = url.match(/^\/collections\/(.+)$/);
  const obj = m ? collections[m[1]] : null;
  return { title, url, handle: handle || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), type: obj ? 'collection_link' : 'http_link', object: obj, links: children, active: false, current: false, child_active: false };
};

export const linklists = {
  'main-menu': {
    links: [
      link('Shop', '/collections/all', [
        link('Bags & Accessories', '/collections/bags-accessories', [link('Handbags', '/collections/handbags'), link('Backpacks', '/collections/backpacks'), link('Purses', '/collections/purses'), link('Travel', '/collections/travel')]),
        link('Shoes', '/collections/shoes', [link('Women', '/collections/womens-shoes'), link('Men', '/collections/mens-shoes'), link('Kids', '/collections/kids-shoes')]),
        link('Jewellery & Watches', '/collections/jewellery-watches', [link('Earrings', '/collections/earrings'), link('Necklaces', '/collections/necklaces'), link('Bracelets', '/collections/bracelets'), link('Watches', '/collections/watches')]),
        link('Fashion', '/collections/fashion'),
        link('Home & Kitchen', '/collections/home-kitchen', [link('Cookware', '/collections/cookware'), link('Storage', '/collections/storage')]),
        link('Electronics & Gadgets', '/collections/electronics-gadgets', [link('Speakers', '/collections/speakers')]),
        link('Beauty & Personal Care', '/collections/beauty-personal-care'),
        link('Shop all', '/collections/all'),
      ]),
      link('New Arrivals', '/collections/new-arrivals'),
      link('Bargains', '/collections/bargains', [link('Under £5', '/collections/under-5'), link('Clearance', '/collections/clearance'), link('Last Chance', '/collections/last-chance')]),
      link('Clearance', '/collections/clearance', [], 'clearance'),
      link('Visit Our Shop', '/pages/visit-our-shop'),
      link('Help', '/pages/contact', [link('Contact us', '/pages/contact'), link('FAQs', '/pages/faqs'), link('Delivery', '/policies/shipping-policy'), link('Returns', '/policies/refund-policy'), link('Click & Collect', '/pages/click-and-collect')]),
    ],
  },
  footer: { links: [link('Contact us', '/pages/contact'), link('FAQs', '/pages/faqs'), link('Delivery', '/policies/shipping-policy'), link('Click & Collect', '/pages/click-and-collect'), link('Returns & refunds', '/policies/refund-policy'), link('About us', '/pages/about')] },
  'footer-shop': { links: [link('Bags & Accessories', '/collections/bags-accessories'), link('Shoes', '/collections/shoes'), link('Jewellery & Watches', '/collections/jewellery-watches'), link('Home & Kitchen', '/collections/home-kitchen'), link('Beauty', '/collections/beauty-personal-care'), link('New Arrivals', '/collections/new-arrivals'), link('Clearance', '/collections/clearance')] },
};

export const pages = {
  'visit-our-shop': { title: 'Visit Our Shop', handle: 'visit-our-shop', url: '/pages/visit-our-shop', content: '<p>GBG Bargain Shop is inside Stanley Meat Market on Prescot Road, Liverpool. Look for Unit M10. [FOR APPROVAL]</p>' },
  faqs: { title: 'FAQs', handle: 'faqs', url: '/pages/faqs', content: '<p>Answers to the questions we get asked most. Can’t find what you need? Get in touch. [FOR APPROVAL]</p>' },
  contact: { title: 'Contact us', handle: 'contact', url: '/pages/contact', content: '<p>Questions about an item, an order or a collection? We’re happy to help. [FOR APPROVAL]</p>' },
};
