-- Up Migration
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('clinic', 'patient')),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE slots (
  id         BIGSERIAL PRIMARY KEY,
  clinic_id  BIGINT NOT NULL REFERENCES users(id),
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- a clinic cannot publish overlapping open slots
  EXCLUDE USING gist (
    clinic_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'open')
);
CREATE INDEX idx_slots_clinic_start ON slots (clinic_id, starts_at);

CREATE TABLE bookings (
  id           BIGSERIAL PRIMARY KEY,
  slot_id      BIGINT NOT NULL REFERENCES slots(id),
  patient_id   BIGINT NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- THE guarantee: at most one confirmed booking per slot
CREATE UNIQUE INDEX uniq_confirmed_booking_per_slot
  ON bookings (slot_id) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_patient ON bookings (patient_id);

-- Down Migration
DROP TABLE bookings;
DROP TABLE slots;
DROP TABLE users;
