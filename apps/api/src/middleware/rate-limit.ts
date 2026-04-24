import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number;      // Max requests per window
  message?: string; // Custom error message
  keyPrefix?: string; // Prefix for Redis keys
}

/**
 * A distributed rate-limiter using Redis.
 * Uses a simple fixed-window counter approach.
 */
export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { windowMs, max, message, keyPrefix = 'rl' } = options;
    
    // Use IP address as the key (or merchantId if logged in)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = `${keyPrefix}:${ip}`;

    try {
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= max) {
        return res.status(429).json({
          success: false,
          error: message || 'Too many requests, please try again later.',
        });
      }

      // Increment counter
      const multi = redis.multi();
      multi.incr(key);
      
      // Only set expiry if it's a new key
      if (count === 0) {
        multi.pexpire(key, windowMs);
      }
      
      await multi.exec();
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count - 1));
      
      next();
    } catch (err: any) {
      console.error('[rate-limit] error:', err.message);
      // Fail open in case of Redis error to not block production traffic
      next();
    }
  };
}

// ── Specific Limit Presets ───────────────────────────────────────────────────

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  keyPrefix: 'auth-limit',
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyPrefix: 'api-limit',
});

export const linkCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 links per hour
  keyPrefix: 'link-create-limit',
});
