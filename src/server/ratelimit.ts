import 'server-only';
import { headers } from 'next/headers';

// Best-effort in-memory limiter (per server instance). Put a WAF / edge rate limit in front for production scale.
const buckets = new Map<string, { n: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const k = `${key}:${await clientIp()}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { n: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [kk, v] of buckets) if (v.reset < now) buckets.delete(kk);
    return true;
  }
  b.n++;
  return b.n <= limit;
}
