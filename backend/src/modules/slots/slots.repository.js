export const slotsRepo = {
  async insert(db, { clinicId, startsAt, endsAt }) {
    const { rows } = await db.query(
      `INSERT INTO slots (clinic_id, starts_at, ends_at) VALUES ($1,$2,$3) RETURNING *`,
      [clinicId, startsAt, endsAt]);
    return rows[0];
  },

  async list(db, { clinicId, from, to, availableOnly, limit, offset }) {
    const { rows } = await db.query(
       `SELECT s.id, s.clinic_id, s.starts_at, s.ends_at, s.status,
              u.name AS clinic_name, (b.id IS NULL) AS available
         FROM slots s
         JOIN users u ON u.id = s.clinic_id
         LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'confirmed'
        WHERE s.status = 'open'
          AND s.starts_at > now()
          AND ($1::bigint IS NULL OR s.clinic_id = $1)
          AND ($2::timestamptz IS NULL OR s.starts_at >= $2)
          AND ($3::timestamptz IS NULL OR s.starts_at < $3)
          AND ($4::boolean = false OR b.id IS NULL)
        ORDER BY s.starts_at
        LIMIT $5 OFFSET $6`,
      [clinicId ?? null, from ?? null, to ?? null, availableOnly === 'true', limit, offset]);
    return rows;
  },

  async listBooked(db, { clinicId, from, to, limit, offset }) {
    const { rows } = await db.query(
      `SELECT s.id, s.clinic_id, u.name AS clinic_name, s.starts_at, s.ends_at
         FROM slots s
         JOIN users u ON u.id = s.clinic_id
         JOIN bookings b ON b.slot_id = s.id AND b.status = 'confirmed'
        WHERE s.status = 'open'
          AND s.starts_at > now()
          AND ($1::bigint IS NULL OR s.clinic_id = $1)
          AND ($2::timestamptz IS NULL OR s.starts_at >= $2)
          AND ($3::timestamptz IS NULL OR s.starts_at < $3)
        ORDER BY s.starts_at
        LIMIT $4 OFFSET $5`,
      [clinicId ?? null, from ?? null, to ?? null, limit, offset]);
    return rows;
  },

  async lockById(db, id) {
    const { rows } = await db.query(`SELECT * FROM slots WHERE id = $1 FOR UPDATE`, [id]);
    return rows[0];
  },

  async listForClinic(db, { clinicId, from, to, limit, offset }) {
    const { rows } = await db.query(
      `SELECT s.id, s.starts_at, s.ends_at, s.status,
              b.id   AS booking_id,
              u.name AS patient_name
         FROM slots s
         LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'confirmed'
         LEFT JOIN users u    ON u.id = b.patient_id
        WHERE s.clinic_id = $1
          AND ($2::timestamptz IS NULL OR s.starts_at >= $2)
          AND ($3::timestamptz IS NULL OR s.starts_at < $3)
        ORDER BY s.starts_at
        LIMIT $4 OFFSET $5`,
      [clinicId, from ?? null, to ?? null, limit, offset]);

    return rows.map(({ booking_id, patient_name, ...slot }) => ({
      ...slot,
      booking: booking_id ? { id: booking_id, patient_name } : null,
    }));
  },

  async markCancelled(db, id) {
    await db.query(`UPDATE slots SET status = 'cancelled' WHERE id = $1`, [id]);
  },
};
