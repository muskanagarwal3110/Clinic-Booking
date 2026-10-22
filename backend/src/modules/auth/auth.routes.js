import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { authController as c } from './auth.controller.js';

const router = Router();
router.post('/register', authLimiter, validate(registerSchema), c.register);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.get('/clinics', c.listClinics); // public directory of clinics (not rate-limited like login)
router.get('/me', requireAuth, c.me);
export default router;