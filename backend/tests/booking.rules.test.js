import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { auth, createClinic, createPatient, createSlot } from './helpers.js';

const book = (patient, slotId) =>
  request(app).post('/api/v1/bookings').set(auth(patient)).send({ slotId });

describe('booking rules', () => {
  it('books an open slot', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);

    const res = await book(patient, slot.id);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slot_id: slot.id, patient_id: patient.id, status: 'confirmed' });
  });

  it('rejects a second booking of the same slot', async () => {
    const clinic = await createClinic();
    const [p1, p2] = [await createPatient(), await createPatient()];
    const slot = await createSlot(clinic);

    await book(p1, slot.id);
    const res = await book(p2, slot.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });

  it('rejects the same patient booking the same slot twice', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);

    await book(patient, slot.id);
    const res = await book(patient, slot.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });

  it('rejects booking a cancelled slot', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic, { status: 'cancelled' });

    const res = await book(patient, slot.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_CANCELLED');
  });

  it('rejects booking a slot that has already started', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic, { hoursFromNow: -2 });

    const res = await book(patient, slot.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_IN_PAST');
  });

  it('returns 404 for an unknown slot', async () => {
    const patient = await createPatient();
    const res = await book(patient, 99999);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('frees the slot when a booking is cancelled so someone else can book it', async () => {
    const clinic = await createClinic();
    const [p1, p2] = [await createPatient(), await createPatient()];
    const slot = await createSlot(clinic);

    const first = await book(p1, slot.id);
    const cancel = await request(app).delete(`/api/v1/bookings/${first.body.id}`).set(auth(p1));
    const second = await book(p2, slot.id);

    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
    expect(second.status).toBe(201);
  });

  it("does not let a patient cancel someone else's booking", async () => {
    const clinic = await createClinic();
    const [owner, other] = [await createPatient(), await createPatient()];
    const slot = await createSlot(clinic);
    const booking = await book(owner, slot.id);

    const res = await request(app).delete(`/api/v1/bookings/${booking.body.id}`).set(auth(other));

    expect(res.status).toBe(403);
  });

  it('rejects cancelling the same booking twice', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);
    const booking = await book(patient, slot.id);

    await request(app).delete(`/api/v1/bookings/${booking.body.id}`).set(auth(patient));
    const res = await request(app).delete(`/api/v1/bookings/${booking.body.id}`).set(auth(patient));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('cancelling a slot also cancels its confirmed booking', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const slot = await createSlot(clinic);
    await book(patient, slot.id);

    const del = await request(app).delete(`/api/v1/slots/${slot.id}`).set(auth(clinic));
    const mine = await request(app).get('/api/v1/bookings/me').set(auth(patient));

    expect(del.status).toBe(204);
    expect(mine.body[0].status).toBe('cancelled');
  });
});

describe('authorization', () => {
  it('requires authentication to book', async () => {
    const res = await request(app).post('/api/v1/bookings').send({ slotId: 1 });
    expect(res.status).toBe(401);
  });

  it('does not let a clinic book slots', async () => {
    const clinic = await createClinic();
    const slot = await createSlot(clinic);
    const res = await book(clinic, slot.id);
    expect(res.status).toBe(403);
  });

  it("does not let a clinic cancel another clinic's slot", async () => {
    const [owner, other] = [await createClinic(), await createClinic()];
    const slot = await createSlot(owner);
    const res = await request(app).delete(`/api/v1/slots/${slot.id}`).set(auth(other));
    expect(res.status).toBe(403);
  });
});

describe('slots', () => {
  const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();

  it('creates a slot', async () => {
    const clinic = await createClinic();
    const res = await request(app)
      .post('/api/v1/slots')
      .set(auth(clinic))
      .send({ startsAt: inHours(24), endsAt: inHours(24.5) });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ clinic_id: clinic.id, status: 'open' });
  });

  it('rejects endsAt before startsAt with a field-level error', async () => {
    const clinic = await createClinic();
    const res = await request(app)
      .post('/api/v1/slots')
      .set(auth(clinic))
      .send({ startsAt: inHours(25), endsAt: inHours(24) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual({
      field: 'endsAt',
      message: 'Must be after startsAt',
    });
  });

  it('rejects a slot in the past', async () => {
    const clinic = await createClinic();
    const res = await request(app)
      .post('/api/v1/slots')
      .set(auth(clinic))
      .send({ startsAt: inHours(-2), endsAt: inHours(-1) });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('startsAt');
  });

  it('rejects an unparseable date', async () => {
    const clinic = await createClinic();
    const res = await request(app)
      .post('/api/v1/slots')
      .set(auth(clinic))
      .send({ startsAt: 'tomorrow-ish', endsAt: inHours(2) });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('startsAt');
  });

  it('rejects overlapping slots from the same clinic', async () => {
    const clinic = await createClinic();
    const create = (s, e) =>
      request(app).post('/api/v1/slots').set(auth(clinic)).send({ startsAt: s, endsAt: e });

    await create(inHours(24), inHours(25));
    const res = await create(inHours(24.5), inHours(25.5));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_OVERLAP');
  });

  it('allows back-to-back slots (end == next start)', async () => {
    const clinic = await createClinic();
    const create = (s, e) =>
      request(app).post('/api/v1/slots').set(auth(clinic)).send({ startsAt: s, endsAt: e });

    await create(inHours(24), inHours(25));
    const res = await create(inHours(25), inHours(26));

    expect(res.status).toBe(201);
  });

  it('allows the same time for different clinics', async () => {
    const [a, b] = [await createClinic(), await createClinic()];
    const body = { startsAt: inHours(24), endsAt: inHours(25) };

    const r1 = await request(app).post('/api/v1/slots').set(auth(a)).send(body);
    const r2 = await request(app).post('/api/v1/slots').set(auth(b)).send(body);

    expect([r1.status, r2.status]).toEqual([201, 201]);
  });

  it('lists only available slots by default and hides booked ones', async () => {
    const clinic = await createClinic();
    const patient = await createPatient();
    const free = await createSlot(clinic, { hoursFromNow: 24 });
    const taken = await createSlot(clinic, { hoursFromNow: 26 });
    await book(patient, taken.id);

    const res = await request(app).get('/api/v1/slots');
    const all = await request(app).get('/api/v1/slots?availableOnly=false');

    expect(res.body.map((s) => s.id)).toEqual([free.id]);
    expect(all.body.map((s) => s.id)).toEqual([free.id, taken.id]);
  });

  it('validates list query params', async () => {
    const res = await request(app).get('/api/v1/slots?limit=9999');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('limit');
  });
});
