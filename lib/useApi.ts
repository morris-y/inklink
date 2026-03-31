import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Evict entries older than 5 minutes to avoid unbounded growth. */
function evictStale() {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, entry] of cache) {
    if (entry.fetchedAt < cutoff) cache.delete(key);
  }
}

// Run eviction every 60 s
if (typeof window !== 'undefined') {
  setInterval(evictStale, 60_000);
}

interface UseApiOptions {
  /** How long (ms) before cached data is considered stale and a background revalidate fires. Default 30 000. */
  staleTime?: number;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  /** Optimistically update the cached value (and local state). Pass a new value or an updater function. */
  mutate: (updater: T | ((prev: T | null) => T | null)) => void;
}

export function useApi<T>(url: string | null, { staleTime = 30_000 }: UseApiOptions = {}): UseApiResult<T> {
  const cached = url ? (cache.get(url) as CacheEntry | undefined) : undefined;
  const [data, setData] = useState<T | null>((cached?.data as T) ?? null);
  const [loading, setLoading] = useState<boolean>(url !== null && !cached);
  // Track the url that initiated the current fetch so we can ignore stale responses
  const activeUrl = useRef(url);

  useEffect(() => {
    activeUrl.current = url;

    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    const entry = cache.get(url);
    if (entry) {
      setData(entry.data as T);
      // If fresh enough, skip refetch
      if (Date.now() - entry.fetchedAt < staleTime) {
        setLoading(false);
        return;
      }
      // Stale — show cached data but revalidate in background (no loading flash)
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(json => {
        if (cancelled || activeUrl.current !== url) return;
        cache.set(url, { data: json, fetchedAt: Date.now() });
        setData(json as T);
      })
      .catch(() => {
        // Network / auth errors — keep stale data if any, clear loading
      })
      .finally(() => {
        if (!cancelled && activeUrl.current === url) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url, staleTime]);

  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T | null)) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(data)
        : updater;
      setData(next);
      if (url && next !== null) {
        cache.set(url, { data: next, fetchedAt: Date.now() });
      } else if (url) {
        cache.delete(url);
      }
    },
    [url, data],
  );

  return { data, loading, mutate };
}

/** Write directly to the cache without triggering a hook re-render.
 *  Useful when you want a subsequent useApi(url) to pick up data immediately. */
export function primeCache(url: string, data: unknown) {
  cache.set(url, { data, fetchedAt: Date.now() });
}

/** Remove a specific URL from the cache. */
export function invalidateCache(url: string) {
  cache.delete(url);
}
