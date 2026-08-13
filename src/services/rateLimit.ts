export interface RateLimiter {
  allow(key: string): boolean;
  prune(): void;
}

/**
 * Fixed-window per-key rate limiter (in-memory). Sufficient for a
 * single-process self-hosted server; multi-instance deployments should move
 * this to shared storage (e.g. Redis) — see docs/security.md.
 */
export function createRateLimiter(limit: number, windowMs: number, maxEntries = 10000): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const prune = () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        if (buckets.size > maxEntries) prune();
        return true;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
    prune,
  };
}

/**
 * Best-effort client IP extraction. Trusts a leading `x-forwarded-for` entry
 * when present (deployments must only set that header at a trusted proxy).
 */
export function clientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.includes(',')) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd)) return fwd[0].split(',')[0].trim();
  return (req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}