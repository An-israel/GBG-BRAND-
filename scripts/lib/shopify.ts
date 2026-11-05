/**
 * Shopify Admin GraphQL client used by every script.
 *
 * - Timeouts on every call (AbortController)                    ENGINEERING #11
 * - Retries with exponential backoff + jitter on 429 / 5xx /
 *   THROTTLED and network errors                                #12, #13
 * - Reads the GraphQL cost throttle status and waits before the
 *   bucket runs dry                                             #1
 * - Only ever calls *.myshopify.com or Shopify's own staged
 *   upload hosts                                                #80 (SSRF)
 * - Mutations are skipped (and logged) in --dry-run mode
 */
import { API_VERSION, type Config } from './config.js';
import type { Logger } from './logger.js';

export interface ClientOptions {
  dryRun?: boolean;
  logger?: Logger;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

export class ShopifyError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
  }
}

const ALLOWED_UPLOAD_HOSTS = [/^shopify-staged-uploads\.storage\.googleapis\.com$/, /^storage\.googleapis\.com$/, /\.myshopify\.com$/, /^cdn\.shopify\.com$/];

export function assertAllowedHost(url: string): void {
  const host = new URL(url).hostname;
  if (!ALLOWED_UPLOAD_HOSTS.some((re) => re.test(host))) {
    throw new ShopifyError(`Refusing to call non-Shopify host: ${host}`);
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function backoffDelay(attempt: number, baseMs: number, retryAfterSec?: number): number {
  if (retryAfterSec && retryAfterSec > 0) return retryAfterSec * 1000;
  const exp = baseMs * 2 ** attempt;
  const jitter = Math.random() * baseMs;
  return Math.min(exp + jitter, 30_000);
}

export class ShopifyClient {
  readonly endpoint: string;
  readonly dryRun: boolean;
  private readonly token: string;
  private readonly log?: Logger;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private throttle?: ThrottleStatus;

  constructor(config: Pick<Config, 'storeDomain' | 'token'>, opts: ClientOptions = {}) {
    this.endpoint = `https://${config.storeDomain}/admin/api/${API_VERSION}/graphql.json`;
    assertAllowedHost(this.endpoint);
    this.token = config.token;
    this.dryRun = !!opts.dryRun;
    this.log = opts.logger;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 5;
    this.baseDelayMs = opts.baseDelayMs ?? 500;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  /** Read-only query. Always runs, even in dry-run mode. */
  query<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>(query, variables);
  }

  /**
   * Mutation. In dry-run mode it is logged and NOT sent; `dryRunResult`
   * is returned instead so callers can continue their flow.
   */
  async mutate<T = any>(mutation: string, variables: Record<string, unknown>, dryRunResult: T, label = 'mutation'): Promise<T> {
    if (this.dryRun) {
      this.log?.info(`[dry-run] would run ${label}: ${JSON.stringify(variables).slice(0, 400)}`);
      return dryRunResult;
    }
    return this.request<T>(mutation, variables);
  }

  private async waitForBudget(expectedCost = 50): Promise<void> {
    const t = this.throttle;
    if (!t || t.currentlyAvailable >= expectedCost) return;
    const waitMs = Math.ceil(((expectedCost - t.currentlyAvailable) / Math.max(t.restoreRate, 1)) * 1000);
    this.log?.info(`Rate limit: ${t.currentlyAvailable}/${t.maximumAvailable} points left, waiting ${waitMs}ms`);
    await this.sleep(waitMs);
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.waitForBudget();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': this.token },
          body: JSON.stringify({ query, variables }),
          signal: ctrl.signal,
        });
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get('Retry-After') || 0);
          lastErr = new ShopifyError(`HTTP ${res.status}`);
          if (attempt < this.maxRetries) {
            const d = backoffDelay(attempt, this.baseDelayMs, retryAfter);
            this.log?.warn(`HTTP ${res.status}, retry ${attempt + 1}/${this.maxRetries} in ${Math.round(d)}ms`);
            await this.sleep(d);
            continue;
          }
          throw lastErr;
        }
        if (!res.ok) throw new ShopifyError(`HTTP ${res.status}: ${await res.text()}`);
        const body: any = await res.json();
        const ts = body?.extensions?.cost?.throttleStatus;
        if (ts) this.throttle = ts;
        if (body.errors?.length) {
          const throttled = body.errors.some((e: any) => e?.extensions?.code === 'THROTTLED');
          if (throttled && attempt < this.maxRetries) {
            const d = backoffDelay(attempt, this.baseDelayMs);
            this.log?.warn(`THROTTLED, retry ${attempt + 1}/${this.maxRetries} in ${Math.round(d)}ms`);
            await this.sleep(d);
            continue;
          }
          throw new ShopifyError(body.errors.map((e: any) => e.message).join('; '), body.errors);
        }
        return body.data as T;
      } catch (err: any) {
        lastErr = err;
        const retriable = err?.name === 'AbortError' || err?.name === 'TypeError' || err?.code === 'ECONNRESET';
        if (retriable && attempt < this.maxRetries) {
          const d = backoffDelay(attempt, this.baseDelayMs);
          this.log?.warn(`${err?.name === 'AbortError' ? 'Timeout' : 'Network error'}, retry ${attempt + 1}/${this.maxRetries} in ${Math.round(d)}ms`);
          await this.sleep(d);
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr;
  }

  /** Iterate every node of a paginated connection. `path` points to the connection in `data`. */
  async *paginate<N = any>(query: string, path: string[], variables: Record<string, unknown> = {}): AsyncGenerator<N> {
    let after: string | null = null;
    do {
      const data: any = await this.query(query, { ...variables, after });
      const conn = path.reduce((o, k) => o?.[k], data);
      for (const edge of conn?.edges ?? []) yield (edge.node ?? edge) as N;
      after = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
    } while (after);
  }
}

/** Throws a readable error when a mutation returns userErrors. */
export function checkUserErrors(label: string, result: any): void {
  const errs = result?.userErrors ?? [];
  if (errs.length) throw new ShopifyError(`${label}: ${errs.map((e: any) => `${(e.field || []).join('.')} ${e.message}`).join('; ')}`, errs);
}
