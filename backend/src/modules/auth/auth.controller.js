import { authService } from './auth.service.js';

export const authController = {
  register: async (req, res, next) => {
    try { res.status(201).json(await authService.register(req.body)); }
    catch (e) { next(e); }
  },
  login: async (req, res, next) => {
    try { res.json(await authService.login(req.body)); }
    catch (e) { next(e); }
  },
  me: async (req, res, next) => {
    try { res.json(await authService.me(req.user.id)); }
    catch (e) { next(e); }
  },
};
