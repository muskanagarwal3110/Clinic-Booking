import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { bookingLimiter } from '../../middleware/rateLimit.js';
import { idParamSchema } from '../../utils/schemas.js';
import { bookSchema } from './bookings.schema.js';
import { bookingsController as c } from './bookings.controller.js';

const router = Router();

router.use(requireAuth, requireRole('patient'));
router.post('/', bookingLimiter, validate(bookSchema), c.book);
router.get('/me', c.listMine);
router.delete('/:id', validate(idParamSchema, 'params'), c.cancel);

export default router;
