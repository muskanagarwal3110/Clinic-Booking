import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';

const valid = { email: 'Jane@Clinic.com', password: 'supersecret1', name: 'Jane', role: 'patient' };

describe('auth', () => {
  it('registers, normalises the email and never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('jane@clinic.com');
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(valid);
    const res = await request(app).post('/api/v1/auth/register').send(valid);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates input with field-level errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'nope', password: 'short', name: '', role: 'admin' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['email', 'name', 'password', 'role']);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/api/v1/auth/register').send(valid);

    const ok = await request(app)
      .post('/api/v1/auth/login').send({ email: 'jane@clinic.com', password: valid.password });
    const bad = await request(app)
      .post('/api/v1/auth/login').send({ email: 'jane@clinic.com', password: 'wrong-password' });

    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns a clear error for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
    it('does not let a clinic reuse an email already used by a patient', async () => {
    await request(app).post('/api/v1/auth/register').send(valid);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...valid, name: 'Jane Clinic', role: 'clinic' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('treats emails that differ only by case or spaces as the same email', async () => {
    await request(app).post('/api/v1/auth/register').send(valid);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...valid, email: '  JANE@CLINIC.COM ' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('lets only one of several simultaneous registrations with one email succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/api/v1/auth/register').send(valid)),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });
});
