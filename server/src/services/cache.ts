type CacheEntry<T> = {
  data: T;
  expires: number;
};

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  // Clear all entries for a specific user
  clearUser(userId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.store.delete(key);
      }
    }
  }

  // Clear expired entries (call periodically if needed)
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton cache instance
const cache = new Cache();

// Cache TTLs
export const CACHE_TTL = {
  DASHBOARD_TODAY: 5 * 60 * 1000,  // 5 minutes
  DASHBOARD_WEEK: 30 * 60 * 1000,  // 30 minutes
};

export function getCache(): Cache {
  return cache;
}
