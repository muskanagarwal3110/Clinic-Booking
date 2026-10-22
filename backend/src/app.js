import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './config/db.js';
import { globalLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import slotsRoutes from './modules/slots/slots.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';

const app = express();

app.set('trust proxy', 1); // correct client IPs for rate limiting behind a proxy/load balancer
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '10kb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/v1', globalLimiter);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/slots', slotsRoutes);
app.use('/api/v1/bookings', bookingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
