import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

/**
 * Shared ioredis instance for the entire API.
 * Configured with maxRetriesPerRequest: null as required by BullMQ.
 * Prioritizes REDIS_URL from the environment.
 */
export const redis = REDIS_URL 
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: null }) 
  : new Redis({ 
      host: REDIS_HOST, 
      port: REDIS_PORT, 
      maxRetriesPerRequest: null 
    });

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});
