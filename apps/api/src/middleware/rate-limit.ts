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
    if (req.headers['x-api-key']) role = 'widget';
    if (req.headers['x-session-token']) role = 'dashboard';
    if (req.headers['x-secret-key']) role = 'server';

    // Use req.ip — Express derives it from X-Forwarded-For honoring `trust proxy`
    // (set in index.ts), so it's the real visitor IP and NOT client-spoofable.
    // The previous left-most `x-forwarded-for` split was attacker-controlled: a
    // client could rotate the header to dodge the rate-limit bucket entirely.
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const key = `${keyPrefix}:${role}:${ip}`;

    // ── Bypass & Special Handling ───────────────────────────────────────────

    // 1. Critical polling bypass (session, orders, quotes)
    const isQuotePoll = req.method === 'GET' && req.path.includes('/v1/quotes');
    if (req.path.endsWith('/auth/session') || isQuotePoll) {
      return next();
    }

    // 2. Dashboards are state-heavy. Authenticated GET requests from the
    // dashboard are exempted from the global limit to prevent auto-refresh lockout.
    if (role === 'dashboard' && req.method === 'GET') {
      return next();
    }

    // 3. /orders — status polling (GET /orders/:id) is frequent, but creation (POST /orders) is sensitive.
    if (req.path.startsWith('/v1/orders')) {
      if (req.method === 'GET') {
        // Polling limit: 300 per 1 min (very generous for widget)
        try {
          const pollKey = `${keyPrefix}:poll:${ip}`;
          const count = await redis.incr(pollKey);
          await redis.pexpire(pollKey, 60 * 1000, 'NX'); // arm/heal TTL, never extend a live window
          if (count > 300) return res.status(429).json({ success: false, error: 'Too many polling requests' });
        } catch (err: any) {
          console.error('[rate-limit] poll error:', err.message); // fail open
        }
        return next();
      }
      // POST /orders falls through to the main limiter
    }

    // 4. /assets — static supported-asset list, safe to call freely.
    if (req.path.startsWith('/v1/assets')) {
      return next();
    }

    try {
      const currentQuota = role === 'dashboard' ? 1000 : max;

      // Increment first (atomic; creates the key at 1 on the first hit), then
      // guarantee the window has a TTL. `pexpire ... NX` sets the expiry only when
      // the key has none — so it arms the window on the first hit AND self-heals
      // any key stuck without a TTL, without ever extending a live window.
      //
      // The previous "set TTL only when count === 0" guard meant a key that ever
      // lost its TTL (or was created without one) counted up forever and never
      // reset → a permanent 429. That had bricked real production IP buckets.
      const count = await redis.incr(key);
      await redis.pexpire(key, windowMs, 'NX');

      res.setHeader('X-RateLimit-Limit', currentQuota);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, currentQuota - count));

      if (count > currentQuota) {
        return res.status(429).json({
          success: false,
          error: message || 'Too many requests, please try again later.',
        });
      }

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
