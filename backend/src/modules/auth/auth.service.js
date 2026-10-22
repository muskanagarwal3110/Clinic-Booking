import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import { authRepo } from './auth.repository.js';
import { Conflict, NotFound, Unauthorized } from '../../errors/AppError.js';

export const signToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN,
  });

// compared against when the email is unknown, so login time doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_ROUNDS);

export const authService = {
  async register(input) {
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    try {
      const user = await authRepo.insert(pool, { ...input, passwordHash });
      return { user, token: signToken(user) };
    } catch (err) {
      if (err.code === '23505') throw Conflict('EMAIL_TAKEN', 'An account with this email already exists');
      throw err;
    }
  },

  async login({ email, password }) {
    const row = await authRepo.findByEmail(pool, email);
    const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok) throw Unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password');
    const user = { ...row };
    delete user.password_hash;
    return { user, token: signToken(user) };
  },

  async me(userId) {
    const user = await authRepo.findById(pool, userId);
    if (!user) throw NotFound('User');
    return user;
  },
};
