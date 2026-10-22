import { pool } from '../src/config/db.js';
import { signToken } from '../src/modules/auth/auth.service.js';

let counter = 0;
const HOUR = 3600_000;

export const resetDb = () =>
  pool.query('TRUNCATE bookings, slots, users RESTART IDENTITY CASCADE');

async function createUser(role) {
  counter += 1;
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, 'x', $2, $3) RETURNING id, role`,
    [`${role}${counter}@test.dev`, role, `${role} ${counter}`]);
  const user = rows[0];
  return { ...user, token: signToken(user) };
}

export const createClinic = () => createUser('clinic');
export const createPatient = () => createUser('patient');
export const createPatients = (n) => Promise.all(Array.from({ length: n }, createPatient));

export const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

/**
 * Inserts a slot straight into the DB (bypasses API validation so tests can create
 * past or cancelled slots). `hoursFromNow` keeps slots for one clinic from overlapping.
 */
export async function createSlot(
  clinic,
  { hoursFromNow = 24, minutes = 30, status = 'open' } = {},
) {
  const start = new Date(Date.now() + hoursFromNow * HOUR);
  const end = new Date(start.getTime() + minutes * 60_000);
  const { rows } = await pool.query(
    `INSERT INTO slots (clinic_id, starts_at, ends_at, status)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [clinic.id, start, end, status]);
  return rows[0];
}
