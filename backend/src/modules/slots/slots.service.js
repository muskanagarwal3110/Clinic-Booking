import { withTransaction, pool } from '../../config/db.js';
import { slotsRepo } from './slots.repository.js';
import { bookingsRepo } from '../bookings/bookings.repository.js';
import { NotFound, Forbidden, Conflict } from '../../errors/AppError.js';

export const slotsService = {
  create: (clinicId, input) => slotsRepo.insert(pool, { clinicId, ...input }),
  list: (filters) => slotsRepo.list(pool, filters),

  cancel: (clinicId, slotId) =>
    withTransaction(async (tx) => {
      const slot = await slotsRepo.lockById(tx, slotId);
      if (!slot) throw NotFound('Slot');
      if (slot.clinic_id !== clinicId) throw Forbidden('You do not own this slot');
      if (slot.status === 'cancelled')
        throw Conflict('SLOT_ALREADY_CANCELLED', 'Slot is already cancelled');

      await bookingsRepo.cancelActiveForSlot(tx, slotId); // cascade
      await slotsRepo.markCancelled(tx, slotId);
    }),
};
