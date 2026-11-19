/**
 * Configuration from .env (never committed). See .env.example.
 * The Admin API version is pinned; review it each quarter (see docs/ENGINEERING.md #102).
 */
import 'dotenv/config';

export const API_VERSION = '2026-10';

export interface Config {
  storeDomain: string;
  /** Admin API access token (custom app made in the Shopify admin), or '' when client credentials are used. */
  token: string;
  /** Newer Shopify apps (Dev Dashboard) give a client ID + secret instead of a token. */
  clientId?: string;
  clientSecret?: string;
  locationName: string;
}

export function loadConfig(): Config {
  const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const token = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
  const clientId = (process.env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
  if (!storeDomain || (!token && !(clientId && clientSecret))) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN and a key: either SHOPIFY_ADMIN_TOKEN, or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET. Copy .env.example to .env and fill it in (on GitHub: Settings → Secrets and variables → Actions).');
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(storeDomain)) {
    throw new Error(`SHOPIFY_STORE_DOMAIN must be the *.myshopify.com domain, got "${storeDomain}"`);
  }
  return { storeDomain, token, clientId, clientSecret, locationName: process.env.GBG_LOCATION_NAME || 'GBG Bargain Shop, Unit M10' };
}
