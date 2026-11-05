import { describe, expect, it, vi } from 'vitest';
import { ShopifyClient, assertAllowedHost, backoffDelay } from '../../scripts/lib/shopify.js';

const cfg = { storeDomain: 'gbg-test.myshopify.com', token: 'x' };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

describe('ShopifyClient', () => {
  it('retries on 429 and 5xx, then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({}, 429, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json({ data: { ok: true } }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const c = new ShopifyClient(cfg, { fetchImpl, sleep });
    expect(await c.query('{ ok }')).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000); // honours Retry-After
  });
  it('retries THROTTLED GraphQL errors', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] }))
      .mockResolvedValueOnce(json({ data: { ok: 1 } }));
    const c = new ShopifyClient(cfg, { fetchImpl, sleep: async () => {} });
    expect(await c.query('{ ok }')).toEqual({ ok: 1 });
  });
  it('waits when the cost bucket is low', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ data: {}, extensions: { cost: { throttleStatus: { maximumAvailable: 1000, currentlyAvailable: 10, restoreRate: 50 } } } }))
      .mockResolvedValueOnce(json({ data: {} }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const c = new ShopifyClient(cfg, { fetchImpl, sleep });
    await c.query('{a}');
    await c.query('{b}');
    expect(sleep).toHaveBeenCalledWith(800); // (50 - 10) / 50 * 1000
  });
  it('gives up after maxRetries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({}, 503));
    const c = new ShopifyClient(cfg, { fetchImpl, sleep: async () => {}, maxRetries: 2 });
    await expect(c.query('{x}')).rejects.toThrow('HTTP 503');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it('does not send mutations in dry-run mode', async () => {
    const fetchImpl = vi.fn();
    const c = new ShopifyClient(cfg, { fetchImpl, dryRun: true });
    expect(await c.mutate('mutation { x }', {}, { fake: true })).toEqual({ fake: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('surfaces GraphQL errors', async () => {
    const c = new ShopifyClient(cfg, { fetchImpl: vi.fn().mockResolvedValue(json({ errors: [{ message: 'Bad field' }] })) });
    await expect(c.query('{x}')).rejects.toThrow('Bad field');
  });
});

describe('safety helpers', () => {
  it('only allows Shopify hosts', () => {
    expect(() => assertAllowedHost('https://evil.example.com/x')).toThrow();
    expect(() => assertAllowedHost('https://gbg.myshopify.com/admin')).not.toThrow();
    expect(() => assertAllowedHost('https://shopify-staged-uploads.storage.googleapis.com/abc')).not.toThrow();
  });
  it('backs off exponentially with a cap', () => {
    expect(backoffDelay(0, 500)).toBeGreaterThanOrEqual(500);
    expect(backoffDelay(3, 500)).toBeGreaterThanOrEqual(4000);
    expect(backoffDelay(20, 500)).toBe(30000);
  });
});
