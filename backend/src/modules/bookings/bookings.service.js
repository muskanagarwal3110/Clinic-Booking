import { withTransaction, pool } from '../../config/db.js';
import { slotsRepo } from '../slots/slots.repository.js';
import { bookingsRepo } from './bookings.repository.js';
import { NotFound, Forbidden, Conflict } from '../../errors/AppError.js';

export const bookingsService = {
  book: (patientId, slotId) =>
    withTransaction(async (tx) => {
      const slot = await slotsRepo.lockById(tx, slotId); // concurrent requests queue here
      if (!slot) throw NotFound('Slot');
      if (slot.status === 'cancelled') throw Conflict('SLOT_CANCELLED', 'This slot was cancelled');
      if (slot.starts_at <= new Date())
        throw Conflict('SLOT_IN_PAST', 'This slot has already started');

      try {
        return await bookingsRepo.insert(tx, { slotId, patientId });
      } catch (err) {
        // 23505 = unique_violation: the DB-level safety net
        if (err.code === '23505')
          throw Conflict('SLOT_ALREADY_BOOKED', 'This slot has already been booked');
        throw err;
      }
    }),

  cancel: (patientId, bookingId) =>
    withTransaction(async (tx) => {
      const booking = await bookingsRepo.findByIdForUpdate(tx, bookingId);
      if (!booking) throw NotFound('Booking');
      if (String(booking.patient_id) !== String(patientId)) throw Forbidden('This is not your booking');
      if (booking.status === 'cancelled')
        throw Conflict('BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled');
      return bookingsRepo.markCancelled(tx, bookingId);
    }),

  listMine: (patientId) => bookingsRepo.listForPatient(pool, patientId),
};
