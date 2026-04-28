import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/serverless-redis';

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
    
    // Judge the "Role" of the request to give it a dedicated bucket
    let role = 'anon';
    if (req.headers['x-api-key'])     role = 'widget';
    if (req.headers['x-session-token']) role = 'dashboard';
    if (req.headers['x-secret-key'])   role = 'server';

    // Smarter IP detection for proxied environments (Vercel/Heroku/Cloudflare)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.ip || req.socket.remoteAddress || 'unknown');
    
    const key = `${keyPrefix}:${role}:${ip}`;

    // ── Bypass & Special Handling ───────────────────────────────────────────
    
    // 1. Critical polling bypass (session, orders, quotes)
    const isOrderPoll = req.method === 'GET' && /\/orders\/[0-9a-fA-F-]+$/.test(req.path);
    const isQuotePoll = req.method === 'GET' && req.path.includes('/v1/quotes');
    if (req.path.endsWith('/auth/session') || isOrderPoll || isQuotePoll) {
      return next();
    }

    // 2. Dashboards are state-heavy. Authenticated GET requests from the
    // dashboard are exempted from the global limit to prevent auto-refresh lockout.
    if (role === 'dashboard' && req.method === 'GET') {
      return next();
    }

    try {
      const currentQuota = role === 'dashboard' ? 1000 : max;
      const count = (await redis.get<number>(key)) || 0;

      if (count >= currentQuota) {
        return res.status(429).json({
          success: false,
          error: message || 'Too many requests, please try again later.',
        });
      }

      // Increment and set expiry in a single pipeline
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      if (count === 0) {
        pipeline.pexpire(key, windowMs);
      }
      await pipeline.exec();
      
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
  max: 360, // 360 requests per minute
  keyPrefix: 'api-limit',
});

export const linkCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 links per hour
  keyPrefix: 'link-create-limit',
});
