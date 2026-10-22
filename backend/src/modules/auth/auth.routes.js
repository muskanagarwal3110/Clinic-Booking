import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { authController as c } from './auth.controller.js';

const router = Router();
router.post('/register', validate(registerSchema), c.register);
router.post('/login', validate(loginSchema), c.login);
router.get('/me', requireAuth, c.me);
export default router;
