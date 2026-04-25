import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

/**
 * Shared ioredis instance for the entire API.
 * Configured with options for high-availability production environments (e.g. Upstash).
 * maxRetriesPerRequest is set to null as strictly required by BullMQ.
 */
const redisOptions = {
  maxRetriesPerRequest: null,
  keepAlive: 10000,
  retryStrategy: (times: number) => {
    // Reconnect after 50ms, 100ms, 150ms... up to a max of 2 seconds
    return Math.min(times * 50, 2000);
  },
  ...(REDIS_URL?.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {})
};

export const redis = REDIS_URL 
  ? new Redis(REDIS_URL, redisOptions) 
  : new Redis({ 
      host: REDIS_HOST, 
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      ...redisOptions
    });

redis.on('error', (err: any) => {
  if (err.code === 'ECONNRESET') {
    console.warn('[redis] Connection dropped. Auto-reconnecting…');
  } else {
    console.error('[redis] Connection error:', err.message);
  }
});
