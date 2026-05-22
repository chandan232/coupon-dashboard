import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL env var not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      // Tune pool — under load this defines per-instance max connections.
      // 10 was too low; 25 fits comfortably within a 100-conn Postgres default
      // and lets multiple Vercel lambdas share the DB without queueing.
      max: 25,
      min: 0,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Statement-level timeout: any single query that takes longer than
      // 30s is killed server-side instead of holding a connection forever.
      statement_timeout: 30_000,
      application_name: 'coupon-dashboard',
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      pool = null;
    });
  }
  return pool;
}

// Slow-query threshold — anything slower than this is logged so we can
// keep finding hot spots in production without external tooling.
const SLOW_QUERY_MS = 750;

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(sql, params);
      const ms = Date.now() - start;
      if (ms > SLOW_QUERY_MS) {
        // Log first 120 chars of SQL so we can correlate without dumping
        // multi-KB query strings into our logs.
        const snippet = sql.replace(/\s+/g, ' ').trim().slice(0, 120);
        console.warn(`[SLOW QUERY ${ms}ms] ${snippet}…`);
      }
      return result.rows as T[];
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

/* ─── In-memory query cache ────────────────────────────────────────────── */
//
// Why: dashboard fires 7-11 heavy aggregation queries on every page load.
// Caching the *result* of each SELECT for a few seconds collapses 100
// dashboards/min into ~1 DB hit/min per query — orders-of-magnitude DB
// load reduction with zero schema changes.
//
// This is a per-Lambda in-memory cache. With Vercel running multiple
// Lambdas concurrently you'll still see N×queries (N = warm lambdas),
// but that's bounded and far less than the un-cached load.
//
// IMPORTANT: never use this for queries whose freshness matters within
// the TTL window — e.g. /api/offers (toggle must reflect immediately).

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

// Periodic cleanup so the Map doesn't grow forever under high cardinality.
function gc() {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}

function cacheKey(sql: string, params: unknown[] | undefined): string {
  return sql + '||' + JSON.stringify(params ?? []);
}

export async function queryCached<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] | undefined,
  ttlSeconds: number,
): Promise<T[]> {
  const key = cacheKey(sql, params);
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T[]> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  // Coalesce concurrent identical requests: if 50 dashboards hit the
  // same query at the same moment and the cache is empty, only one DB
  // round-trip happens and the rest await the same promise.
  const existing = inflight.get(key) as Promise<T[]> | undefined;
  if (existing) return existing;

  const promise = query<T>(sql, params)
    .then(rows => {
      cache.set(key, { value: rows, expiresAt: Date.now() + ttlSeconds * 1000 });
      if (cache.size % 50 === 0) gc();
      return rows;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Manually invalidate every cached entry. Call after writes. */
export function invalidateCache(): void {
  cache.clear();
  inflight.clear();
}
