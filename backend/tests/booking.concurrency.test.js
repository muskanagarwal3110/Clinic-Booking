import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import { auth, createClinic, createPatient, createPatients, createSlot } from './helpers.js';

describe('booking concurrency', () => {
  it('allows exactly one of 20 simultaneous bookings for the same slot', async () => {
    const clinic = await createClinic();
    const slot = await createSlot(clinic);
    const patients = await createPatients(20);

    const results = await Promise.all(
      patients.map((p) =>
        request(app).post('/api/v1/bookings').set(auth(p)).send({ slotId: slot.id })),
    );

    const codes = results.map((r) => r.status);
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(19);

    const { rows } = await pool.query(
      `SELECT count(*) AS n FROM bookings WHERE slot_id = $1 AND status = 'confirmed'`,
      [slot.id]);
    expect(rows[0].n).toBe(1);
  });

  it('never double-books when the same patient double-clicks', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post('/api/v1/bookings').set(auth(patient)).send({ slotId: slot.id })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });

  it('lets exactly one of several simultaneous cancels of one booking succeed', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);
    const booking = await request(app)
      .post('/api/v1/bookings').set(auth(patient)).send({ slotId: slot.id });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).delete(`/api/v1/bookings/${booking.body.id}`).set(auth(patient))),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(9);
  });

  it('keeps data consistent when a booking races with a slot cancellation', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();

    // repeat so both interleavings (book first / cancel first) get exercised
    for (let i = 0; i < 10; i++) {
      const slot = await createSlot(clinic, { hoursFromNow: 24 + i });
      const [, cancelRes] = await Promise.all([
        request(app).post('/api/v1/bookings').set(auth(patient)).send({ slotId: slot.id }),
        request(app).delete(`/api/v1/slots/${slot.id}`).set(auth(clinic)),
      ]);
      expect(cancelRes.status).toBe(204);
    }

    // invariant: a cancelled slot never keeps a confirmed booking
    const { rows } = await pool.query(
      `SELECT count(*) AS n FROM bookings b JOIN slots s ON s.id = b.slot_id
        WHERE b.status = 'confirmed' AND s.status = 'cancelled'`);
    expect(rows[0].n).toBe(0);
  });
});
