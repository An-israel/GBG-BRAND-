// Lighthouse CI on every pull request, against the offline design preview (real theme
// files, sample products). Catches CSS/JS/markup regressions before anything reaches Shopify.
// The real-store run (lighthouserc.cjs) happens after deploy to the preview theme.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node tools/preview/serve.mjs',
      startServerReadyPattern: 'preview on',
      url: ['http://localhost:4321/index', 'http://localhost:4321/collection', 'http://localhost:4321/product'],
      numberOfRuns: 2,
      settings: { formFactor: 'mobile', throttlingMethod: 'simulate' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        // Meta descriptions come from Shopify admin, so the offline preview has none.
        'categories:seo': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
