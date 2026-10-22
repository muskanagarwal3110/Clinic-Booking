# Clinic Booking

Clinics publish time slots and patients book them. A slot can never be double-booked, even when
many requests arrive at the same moment.

## Features

- Clinic and patient accounts (JWT auth, one account per email address)
- Clinics publish, list and cancel time slots
- Patients browse open slots, filter by clinic, book and cancel
- Already-booked slots are visible to everyone, without showing who booked them
- Input validation with field-level, human-readable errors
- Redis-backed rate limiting
- Automated tests for the booking rules, including concurrent bookings

## Screenshots

### Clinic dashboard
![Clinic dashboard showing published and booked time slots](./images/clinic.png)

### Patient dashboard
![Patient dashboard showing available appointments and bookings](./images/patient.png)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, TanStack Query, Axios |
| Backend | Node.js 20+, Express, Zod (validation), JWT, bcrypt, Pino (logging) |
| Database | PostgreSQL 16 (migrations with node-pg-migrate) |
| Cache / limits | Redis 7 (rate limiting only) |
| Tests / CI | Vitest, Supertest, GitHub Actions |

## Architecture

```
React (Vite, :5173)  ──►  Express API (:3000)  ──►  PostgreSQL (:5432)
                                  │                  source of truth, enforces booking rules
                                  └──────────────►  Redis (:6379)
                                                     rate limiting only (API keeps working if Redis is down)
```

The backend is organised by feature. Each module follows the same layers:
`routes → controller → service → repository`. Routes declare middleware, controllers handle HTTP,
services hold business rules, and repositories hold SQL.

## Prerequisites

- Node.js 20 or newer
- Docker with Docker Compose (for Postgres and Redis)

## Run it locally

**1. Start Postgres and Redis**
```bash
docker compose up -d
```
This starts three containers: `postgres` (port 5432, the app database), `postgres_test` (port 5433,
used only by the tests) and `redis` (port 6379). The app itself runs on your machine, not in Docker.

**2. Start the backend** (new terminal)
```bash
cd backend
cp .env.example .env        # on Windows PowerShell: copy .env.example .env
npm install
npm run migrate             # creates the tables
npm run dev                 # API on http://localhost:3000
```
Check it: open http://localhost:3000/health. It should return `{"status":"ok"}`.

**3. Start the frontend** (another terminal)
```bash
cd frontend
npm install
npm run dev                 # app on http://localhost:5173
```
In development, Vite proxies `/api` to `localhost:3000`, so no CORS setup is needed.

**4. Try it**
1. Register an account as a **Clinic** and publish a few times.
2. Sign out, then register another account as a **Patient**.
3. Browse, filter by clinic, book and cancel.

**Stop everything:** press Ctrl+C in each terminal, then `docker compose down`
(add `-v` to also delete the database data).

## Environment variables (`backend/.env`)

| Variable | Default / example | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `3000` | API port |
| `DATABASE_URL` | `postgres://app:app@localhost:5432/clinic` | Postgres connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_SECRET` | (must be 16+ characters) | Signs login tokens. **Change it in production.** |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |
| `BCRYPT_ROUNDS` | `10` | Password hashing cost |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |

Frontend: set `VITE_API_URL` (for example `https://api.example.com/api/v1`) only for production
builds. See `frontend/.env.example`.

## Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | API with auto-reload |
| backend | `npm start` | API without auto-reload |
| backend | `npm run migrate` | apply database migrations |
| backend | `npm run migrate:down` | roll back the last migration |
| backend | `npm test` | run the test suite |
| backend | `npm run lint` | ESLint |
| frontend | `npm run dev` | dev server |
| frontend | `npm run build` | production build into `dist/` |
| frontend | `npm run preview` | serve the production build locally |

## Running the tests

```bash
docker compose up -d postgres_test    # the tests need the test database
cd backend
npm test
```
Tests run against the separate `clinic_test` database (port 5433), apply migrations automatically,
and reset the data before every test. They never touch your development data, and rate limiting is
switched off in tests.

What they cover:
- **Booking rules:** open slots, double booking, cancelled/past slots, freeing a slot on cancel, ownership and role checks
- **Concurrency:** 20 simultaneous bookings of one slot produce exactly one success, plus cancellation/booking races
- **Booked list:** booked slots never expose patient information
- **Slots and validation:** overlap rules, past dates, field-level errors
- **Auth:** registration, case-insensitive duplicate emails, login, malformed input

## How double-booking is prevented

1. **Row lock.** Booking runs in a transaction that locks the slot row (`SELECT ... FOR UPDATE`), so
   concurrent requests for the same slot are processed one at a time.
2. **Database guarantee.** A partial unique index (`UNIQUE (slot_id) WHERE status = 'confirmed'`)
   rejects a second confirmed booking even if the application code is wrong. The API turns that into
   `409 SLOT_ALREADY_BOOKED`.
3. **Redis is not part of correctness.** It only does rate limiting, and the limiter fails open.

## Business rules

- A clinic cannot publish overlapping open slots (enforced by a Postgres exclusion constraint).
  Back-to-back slots are allowed.
- Slots must start in the future and last 5 minutes to 8 hours.
- Past and cancelled slots cannot be booked.
- Cancelling a slot also cancels its confirmed booking, in the same transaction.
- Cancelling a booking frees the slot so it can be booked again.
- Only the owning clinic can cancel its slots. Only the owning patient can cancel a booking.
- One email, one account, across both roles. Emails are compared case-insensitively.
- Booked slots are public, but never reveal the patient.

## API reference

Base URL: `http://localhost:3000/api/v1`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a clinic or patient |
| POST | `/auth/login` | Public | Log in and receive a token |
| GET | `/auth/me` | Authenticated | Get the current user |
| GET | `/auth/clinics` | Public | List clinics |
| GET | `/slots` | Public | List slots; supports clinic/date/availability filters |
| POST | `/slots` | Clinic | Publish a time slot |
| DELETE | `/slots/:id` | Clinic owner | Cancel a slot and its booking |
| POST | `/bookings` | Patient | Book a slot |
| GET | `/bookings/me` | Patient | List your bookings |
| DELETE | `/bookings/:id` | Booking owner | Cancel a booking |
| GET | `/health`, `/ready` | Public | Health and database readiness |

Errors use a consistent `{ error: { code, message, details } }` response shape. See the route definitions for request schemas and error codes.

## Rate limiting

Limits are per IP and stored in Redis: 100 requests per minute overall, 10 login/register attempts
per 15 minutes, 20 bookings per minute. If Redis is unavailable, requests are allowed through.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request. The backend job starts Postgres and
Redis, then runs lint and tests. The frontend job builds the app.

## Troubleshooting

- **Port already in use:** stop whatever uses 5432, 5433, 6379, 3000 or 5173, or change the port.
- **`npm run migrate` cannot connect:** run `docker compose ps` and check `postgres` is running.
- **Tests cannot connect:** start `postgres_test` (`docker compose up -d postgres_test`).
- **Too many requests (429) while testing by hand:** `docker compose exec redis redis-cli FLUSHALL`.
- **Reset the database:** `docker compose down -v`, then `docker compose up -d` and `npm run migrate`.

## Ideas for next steps

Idempotency keys on booking, a waitlist, email reminders, per-clinic time zones, Redis caching of the
slot list, and deployment config.