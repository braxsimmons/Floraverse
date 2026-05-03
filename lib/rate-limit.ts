// Simple in-process token bucket rate limiter.
// For multi-instance production, swap with Upstash Redis.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, opts: { capacity: number; refillPerSec: number }) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsedSec = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfterMs: Math.ceil(((1 - b.tokens) / opts.refillPerSec) * 1000) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true, retryAfterMs: 0 };
}
