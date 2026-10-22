import { withTransaction, pool } from '../../config/db.js';
import { slotsRepo } from './slots.repository.js';
import { bookingsRepo } from '../bookings/bookings.repository.js';
import { NotFound, Forbidden, Conflict } from '../../errors/AppError.js';

export const slotsService = {
  create: (clinicId, input) => slotsRepo.insert(pool, { clinicId, ...input }),
  list: (filters) => slotsRepo.list(pool, filters),

  // Clinic dashboard: clinicId must come from the JWT (req.user.id), never from the query string
  listForClinic: (clinicId, query = {}) =>
    slotsRepo.listForClinic(pool, {
      clinicId,
      from: query.from,
      to: query.to,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    }),

  cancel: (clinicId, slotId) =>
    withTransaction(async (tx) => {
      const slot = await slotsRepo.lockById(tx, slotId);
      if (!slot) throw NotFound('Slot');
      if (String(slot.clinic_id) !== String(clinicId)) throw Forbidden('You do not own this slot');
      if (slot.status === 'cancelled')
        throw Conflict('SLOT_ALREADY_CANCELLED', 'Slot is already cancelled');

      await bookingsRepo.cancelActiveForSlot(tx, slotId); // cascade
      await slotsRepo.markCancelled(tx, slotId);
    }),
};