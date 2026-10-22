# Clinic Booking API

Clinics publish time slots; patients book them. Node + Express, Postgres, Redis (rate limiting only).

## Run it
```bash
docker compose up -d            # postgres (5432), postgres_test (5433), redis
cd backend && cp .env.example .env
npm install
npm run migrate
npm run dev                     # http://localhost:3000
npm test                        # runs against postgres_test
```
Add the `scripts` from `package.scripts.json` to `package.json` (and `npm i -D @eslint/js globals`).

## How double-booking is prevented
1. **Row lock:** booking runs in a transaction that does `SELECT ... FOR UPDATE` on the slot, so concurrent
   requests for one slot are serialised.
2. **Database guarantee:** a partial unique index (`UNIQUE (slot_id) WHERE status = 'confirmed'`) rejects a
   second confirmed booking even if application code is wrong. Violations map to `409 SLOT_ALREADY_BOOKED`.
3. Redis is **not** involved in correctness; rate limiting fails open if Redis is down.

## Rules
- A clinic cannot publish overlapping open slots (`EXCLUDE` constraint, back-to-back is allowed).
- Slots must be in the future, 5 min to 8 h long.
- Cancelling a slot cancels its confirmed booking in the same transaction.
- Cancelling a booking frees the slot. Past and cancelled slots cannot be booked.
- Only the owning clinic can cancel a slot; only the owning patient can cancel a booking.

## Endpoints (`/api/v1`)
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | /auth/register | public | `{email, password, name, role}` |
| POST | /auth/login | public | returns JWT |
| GET | /auth/me | any | |
| GET | /slots | public | `clinicId, from, to, availableOnly, limit, offset` |
| POST | /slots | clinic | `{startsAt, endsAt}` |
| DELETE | /slots/:id | clinic | 204 |
| POST | /bookings | patient | `{slotId}` |
| GET | /bookings/me | patient | |
| DELETE | /bookings/:id | patient | |

Errors always look like `{ "error": { "code", "message", "details?" } }`.
Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED`/`INVALID_TOKEN` 401, `FORBIDDEN` 403, `NOT_FOUND` 404,
`SLOT_ALREADY_BOOKED` / `SLOT_CANCELLED` / `SLOT_IN_PAST` / `SLOT_OVERLAP` / `BOOKING_ALREADY_CANCELLED` 409,
`RATE_LIMITED` 429.

## Next steps
Idempotency keys, waitlist, email reminders, per-clinic timezones.
