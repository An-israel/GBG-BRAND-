/**
 * Configuration from .env (never committed). See .env.example.
 * The Admin API version is pinned; review it each quarter (see docs/ENGINEERING.md #102).
 */
import 'dotenv/config';

export const API_VERSION = '2026-10';

export interface Config {
  storeDomain: string;
  token: string;
  locationName: string;
}

export function loadConfig(): Config {
  const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const token = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
  if (!storeDomain || !token) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN. Copy .env.example to .env and fill it in.');
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(storeDomain)) {
    throw new Error(`SHOPIFY_STORE_DOMAIN must be the *.myshopify.com domain, got "${storeDomain}"`);
  }
  return { storeDomain, token, locationName: process.env.GBG_LOCATION_NAME || 'GBG Bargain Shop, Unit M10' };
}
