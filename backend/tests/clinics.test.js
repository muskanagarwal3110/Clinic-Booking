import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { createClinic, createPatient, createSlot } from './helpers.js';

describe('clinics', () => {
  it('lists every clinic, including ones with no slots, and no patients', async () => {
    const withSlots = await createClinic();
    const empty = await createClinic();
    await createPatient();
    await createSlot(withSlots);

    const res = await request(app).get('/api/v1/auth/clinics');

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.id).sort()).toEqual([withSlots.id, empty.id].sort());
    expect(Object.keys(res.body[0]).sort()).toEqual(['id', 'name']); // no email or hash leaked
  });

  it('returns no open slots for a clinic that has not published any', async () => {
    const empty = await createClinic();
    const res = await request(app).get(`/api/v1/slots?clinicId=${empty.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});