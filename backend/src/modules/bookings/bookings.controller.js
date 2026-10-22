import { bookingsService } from './bookings.service.js';

export const bookingsController = {
  book: async (req, res, next) => {
    try { res.status(201).json(await bookingsService.book(req.user.id, req.body.slotId)); }
    catch (e) { next(e); }
  },
  cancel: async (req, res, next) => {
    try { res.json(await bookingsService.cancel(req.user.id, req.params.id)); }
    catch (e) { next(e); }
  },
  listMine: async (req, res, next) => {
    try { res.json(await bookingsService.listMine(req.user.id)); }
    catch (e) { next(e); }
  },
};
