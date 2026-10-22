import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// lazyConnect: nothing connects until the first command (so tests never open a socket)
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });

redis.on('error', (err) => logger.warn({ err: err.message }, 'redis error'));
