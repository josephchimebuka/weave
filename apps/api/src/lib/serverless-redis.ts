import { Redis } from '@upstash/redis';

function createRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // Upstash REST client requires https:// — never fall back to local redis:// URLs.
  if (url && token && url.startsWith('https://')) {
    return new Redis({ url, token });
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('[redis] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting degraded');
  } else {
    console.warn('[redis] Upstash not configured — using in-memory no-op rate limiter for local dev');
  }

  type Entry = { value: string | number; expiresAt?: number };
  const store = new Map<string, Entry>();

  const isExpired = (entry: Entry | undefined) =>
    entry?.expiresAt != null && Date.now() > entry.expiresAt;

  const read = (key: string) => {
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      store.delete(key);
      return null;
    }
    return entry;
  };

  return {
    get: async <T = string>(key: string) => {
      const entry = read(key);
      return (entry?.value ?? null) as T | null;
    },
    set: async (key: string, value: string | number, opts?: { px?: number; ex?: number }) => {
      let expiresAt: number | undefined;
      if (opts?.px != null) expiresAt = Date.now() + opts.px;
      if (opts?.ex != null) expiresAt = Date.now() + opts.ex * 1000;
      store.set(key, { value, expiresAt });
      return 'OK';
    },
    incr: async (key: string) => {
      const entry = read(key);
      const next = Number(entry?.value ?? 0) + 1;
      store.set(key, { value: next, expiresAt: entry?.expiresAt });
      return next;
    },
    pexpire: async (key: string, ms: number) => {
      const entry = read(key);
      if (!entry) return 0;
      store.set(key, { ...entry, expiresAt: Date.now() + ms });
      return 1;
    },
    pipeline: () => {
      const ops: Array<{ type: 'incr'; key: string } | { type: 'pexpire'; key: string; ms: number }> = [];
      const pipe = {
        incr: (key: string) => {
          ops.push({ type: 'incr', key });
          return pipe;
        },
        pexpire: (key: string, ms: number) => {
          ops.push({ type: 'pexpire', key, ms });
          return pipe;
        },
        exec: async () => {
          for (const op of ops) {
            if (op.type === 'incr') {
              const entry = read(op.key);
              const next = Number(entry?.value ?? 0) + 1;
              store.set(op.key, { value: next, expiresAt: entry?.expiresAt });
            } else {
              const entry = read(op.key);
              if (entry) store.set(op.key, { ...entry, expiresAt: Date.now() + op.ms });
            }
          }
          return [];
        },
      };
      return pipe;
    },
  } as unknown as Redis;
}

/**
 * Serverless Redis client for rate limiting in production.
 * Local dev works without Upstash when https REST credentials are absent.
 */
export const redis = createRedis();
