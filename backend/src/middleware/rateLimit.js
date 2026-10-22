import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const passthrough = (_req, _res, next) => next();

const make = ({ prefix, windowMs, limit }) => {
  // Tests exercise business rules, not throttling (and shouldn't need Redis)
  if (env.NODE_ENV === 'test') return passthrough;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7', // RateLimit-* headers
    legacyHeaders: false,
    passOnStoreError: true, // fail-open: Redis down must not mean API down
    store: new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args) => redis.call(...args),
    }),
    handler: (_req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
      }),
  });
};

export const globalLimiter = make({ prefix: 'global', windowMs: 60_000, limit: 100 });
export const authLimiter = make({ prefix: 'auth', windowMs: 15 * 60_000, limit: 10 });
export const bookingLimiter = make({ prefix: 'booking', windowMs: 60_000, limit: 20 });
