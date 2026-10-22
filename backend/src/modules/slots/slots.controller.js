import { slotsService } from './slots.service.js';

export const slotsController = {
  create: async (req, res, next) => {
    try { res.status(201).json(await slotsService.create(req.user.id, req.body)); }
    catch (e) { next(e); }
  },
  list: async (req, res, next) => {
    try { res.json(await slotsService.list(req.query)); }
    catch (e) { next(e); }
  },
  listMine: async (req, res, next) => {
    try { res.json(await slotsService.listForClinic(req.user.id, req.query)); }
    catch (e) { next(e); }
  },
  cancel: async (req, res, next) => {
    try {
      await slotsService.cancel(req.user.id, req.params.id);
      res.status(204).end();
    } catch (e) { next(e); }
  },
};
