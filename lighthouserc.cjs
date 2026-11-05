// Lighthouse CI budgets (brief §12.1). PREVIEW_URL must include ?preview_theme_id=…
// Templates: home, a collection and a product. Mobile emulation (budget Android) is the default.
const base = process.env.PREVIEW_URL || 'http://localhost:4321/';
const withPath = (p) => { const u = new URL(base); const t = new URL(p, u.origin); u.searchParams.forEach((v, k) => t.searchParams.set(k, v)); return t.toString(); };
module.exports = {
  ci: {
    collect: {
      // Set LHCI_PRODUCT_PATH (e.g. /products/tan-faux-leather-tote-bag) as a repository variable.
      url: [withPath('/'), withPath(process.env.LHCI_COLLECTION_PATH || '/collections/all'), ...(process.env.LHCI_PRODUCT_PATH ? [withPath(process.env.LHCI_PRODUCT_PATH)] : [])],
      numberOfRuns: 3,
      settings: { preset: 'perf', formFactor: 'mobile', throttlingMethod: 'simulate' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'long-tasks': ['warn', {}],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
