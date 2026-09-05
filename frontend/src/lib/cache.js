/**
 * Lightweight in-memory + sessionStorage cache for API responses.
 *
 * Static game data (catalog, stages, tsukuyomi bosses, boss-hunt bosses) is
 * safe to cache aggressively. Mutable account state (energy, currency,
 * inventory, progression) is NOT cached here — those always hit the server.
 *
 * Usage:
 *   const data = await cachedFetch("/game/tsukuyomi", { ttl: 120_000 });
 */

const memCache = new Map();

/**
 * Fetch with caching. Returns cached data if fresh, otherwise fetches
 * from the API and updates the cache. Always returns the cached data
 * immediately if available (even stale), then optionally revalidates.
 *
 * @param {string} url       — API URL (relative to api baseURL)
 * @param {object} opts
 * @param {number} opts.ttl — cache lifetime in ms (default 120s)
 * @param {boolean} opts.revalidate — if true, return stale data immediately
 *   but still fetch in the background to update the cache
 * @param {object} apiClient — axios instance
 */
export async function cachedFetch(url, opts = {}, apiClient) {
  const { ttl = 120_000, revalidate = false } = opts;
  const key = url;
  const now = Date.now();
  const entry = memCache.get(key);

  // Fresh cache — return immediately
  if (entry && now - entry.timestamp < ttl) {
    if (revalidate) {
      // Fire-and-forget background refresh
      apiClient.get(url).then(({ data }) => {
        memCache.set(key, { data, timestamp: Date.now() });
      }).catch(() => {});
    }
    return entry.data;
  }

  // Stale cache + revalidate — return stale data, refresh in background
  if (entry && revalidate) {
    apiClient.get(url).then(({ data }) => {
      memCache.set(key, { data, timestamp: Date.now() });
    }).catch(() => {});
    return entry.data;
  }

  // No cache or stale without revalidate — fetch fresh
  const { data } = await apiClient.get(url);
  memCache.set(key, { data, timestamp: Date.now() });
  return data;
}

/** Manually prime the cache (e.g. after a mutation that changes the data). */
export function primeCache(url, data) {
  memCache.set(url, { data, timestamp: Date.now() });
}

/** Invalidate a cache entry so the next fetch hits the server. */
export function invalidateCache(url) {
  memCache.delete(url);
}

/** Clear all cached entries. */
export function clearCache() {
  memCache.clear();
}
