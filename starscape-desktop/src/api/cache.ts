// ---------------------------------------------------------------------------
// StarScape — localStorage-based cache (replaces MMKV from mobile version)
// ---------------------------------------------------------------------------
// Simple TTL cache using window.localStorage.
// Keys are namespaced under "starscape:" to avoid collisions.
// ---------------------------------------------------------------------------

const NS = 'starscape:';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(NS + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(NS + key, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (private mode quota) — silently skip
  }
}

export const CacheKeys = {
  planets: (hourBucket: string) => `planets:${hourBucket}`,
  skyConditions: (lat: number, lon: number) =>
    `sky:${lat.toFixed(2)},${lon.toFixed(2)}`,
} as const;
