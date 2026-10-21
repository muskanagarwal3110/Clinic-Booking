# Clinic Booking

Clinics publish time slots; patients book them. A slot can never be double-booked, even under concurrent requests.

- **backend/**: Node, Express, Postgres, Redis (rate limiting). See `backend/README.md` for the rules and endpoints.
- **frontend/**: React, Vite, TanStack Query.

## Run locally
```bash
docker compose up -d                       # Postgres (5432, 5433 for tests) + Redis

cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev                                # API on :3000

cd ../frontend                             # in a second terminal
npm install
npm run dev                                # app on :5173 (proxies /api to :3000)
```
Run the backend tests with `npm test` inside `backend/`.

## Architecture
```
React (Vite) --> Express API --> Postgres   (source of truth; enforces the booking rules)
                      |
                      +--------> Redis      (rate limiting only; API fails open if it is down)
```

## How double-booking is prevented
1. Booking runs in a transaction that locks the slot row (`SELECT ... FOR UPDATE`), so concurrent requests queue.
2. A partial unique index allows only one `confirmed` booking per slot, so the database rejects a duplicate even if the code is wrong.
3. Tests fire 20 simultaneous bookings at one slot and assert exactly one succeeds.

## Using the app
Register one account as a **Clinic** and publish some times, then register another as a **Patient** to book them.
