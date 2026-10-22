import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idParamSchema } from '../../utils/schemas.js';
import { createSlotSchema, listSlotsSchema, mineSlotsSchema } from './slots.schema.js';
import { slotsController as c } from './slots.controller.js';

const router = Router();

router.get('/', validate(listSlotsSchema, 'query'), c.list); // public: never includes patient info
router.post('/', requireAuth, requireRole('clinic'), validate(createSlotSchema), c.create);
router.get('/mine', requireAuth, requireRole('clinic'), validate(mineSlotsSchema, 'query'), c.listMine);
router.delete('/:id', requireAuth, requireRole('clinic'), validate(idParamSchema, 'params'), c.cancel);

export default router;