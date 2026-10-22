import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idParamSchema } from '../../utils/schemas.js';
import { createSlotSchema, listSlotsSchema } from './slots.schema.js';
import { slotsController as c } from './slots.controller.js';

const router = Router();

router.get('/', validate(listSlotsSchema, 'query'), c.list); // public
router.post('/', requireAuth, requireRole('clinic'), validate(createSlotSchema), c.create);
router.delete('/:id', requireAuth, requireRole('clinic'), validate(idParamSchema, 'params'), c.cancel);

export default router;
