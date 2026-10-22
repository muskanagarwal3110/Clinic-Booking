import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Forbidden, Unauthorized } from '../errors/AppError.js';

export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(Unauthorized('UNAUTHENTICATED', 'Missing or malformed Authorization header'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(Unauthorized('INVALID_TOKEN', 'Invalid or expired token'));
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : next(Forbidden(`This action requires the role: ${roles.join(' or ')}`));
