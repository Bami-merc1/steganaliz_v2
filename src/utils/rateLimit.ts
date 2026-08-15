interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Sliding window rate limiter.
// Returns true if the action is allowed, false if the limit is exceeded.
export function checkRateLimit(
  key: string,
  maxCallsPerWindow: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxCallsPerWindow) {
    return false;
  }

  entry.count++;
  return true;
}

// Per-operation limits, matching the project doc's specification:
export const RATE_LIMITS = {
  embed: { maxCalls: 10, windowMs: 60_000 },   // 10 embeds per minute
  extract: { maxCalls: 10, windowMs: 60_000 },  // 10 extracts per minute
  detect: { maxCalls: 20, windowMs: 60_000 },   // 20 detections per minute
  batch: { maxCalls: 3, windowMs: 60_000 },     // 3 batch runs per minute
} as const;