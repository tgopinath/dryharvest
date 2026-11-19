// Static demo: an in-memory Postgres (PGlite) that lives inside the app process.
// No external database — every cold start applies the migrations and loads the
// demo catalogue from scripts/seed-data.ts. Nothing written here is persisted.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { initDemoDb } from './demo-seed';

const globalForDb = globalThis as unknown as { pglite?: { raw: PGlite; ready: Promise<void> } };

function boot() {
  const raw = new PGlite();
  const ready = initDemoDb(raw);
  return { raw, ready };
}
const { raw, ready } = (globalForDb.pglite ??= boot());

// Every query waits for the seed to finish before running.
const GATED = new Set(['query', 'exec', 'transaction']);
const client = new Proxy(raw, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== 'function') return value;
    if (GATED.has(prop as string)) return async (...args: unknown[]) => { await ready; return value.apply(target, args); };
    return value.bind(target);
  },
});

export const db = drizzle({ client, schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export { schema };
