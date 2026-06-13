/**
 * In-memory daily per-device rate limiter. Sufficient for dev and small
 * deployments. Replace with Redis when we run on more than one process.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const DAY_MS = 24 * 60 * 60 * 1000;

export function checkRateLimit(deviceId: string, perDay: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const existing = buckets.get(deviceId);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + DAY_MS };
    buckets.set(deviceId, fresh);
    return { allowed: true, remaining: perDay - 1, resetAt: fresh.resetAt };
  }
  if (existing.count >= perDay) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: perDay - existing.count,
    resetAt: existing.resetAt,
  };
}
