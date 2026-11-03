/**
 * Tiny in-process TTL memo for hot public GETs.
 * One compute at a time per key (in-flight coalesce) so a stampede
 * of visitors doesn't fan out into N identical DB round-trips.
 */

type Entry<T> = { value: T; expiresAt: number };

export function createTtlMemo<T>(ttlMs: number) {
  let entry: Entry<T> | null = null;
  let inflight: Promise<T> | null = null;

  return {
    async get(compute: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
      if (entry && entry.expiresAt > Date.now()) {
        return { value: entry.value, hit: true };
      }
      if (inflight) {
        const value = await inflight;
        return { value, hit: false };
      }
      inflight = (async () => {
        try {
          const value = await compute();
          entry = { value, expiresAt: Date.now() + ttlMs };
          return value;
        } finally {
          inflight = null;
        }
      })();
      const value = await inflight;
      return { value, hit: false };
    },
    invalidate() {
      entry = null;
    },
  };
}
