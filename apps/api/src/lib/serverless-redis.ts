import { Redis } from '@upstash/redis';

/**
 * Serverless Redis client for use in Vercel functions.
 * Uses HTTP instead of TCP to avoid connection timeouts (ECONNRESET/ETIMEDOUT).
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});
