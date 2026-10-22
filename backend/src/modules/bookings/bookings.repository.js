export const bookingsRepo = {
  async insert(db, { slotId, patientId }) {
    const { rows } = await db.query(
      `INSERT INTO bookings (slot_id, patient_id) VALUES ($1,$2) RETURNING *`,
      [slotId, patientId]);
    return rows[0];
  },
  async findByIdForUpdate(db, id) {
    const { rows } = await db.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
    return rows[0];
  },
  async markCancelled(db, id) {
    const { rows } = await db.query(
      `UPDATE bookings SET status='cancelled', cancelled_at=now() WHERE id=$1 RETURNING *`, [id]);
    return rows[0];
  },
  async cancelActiveForSlot(db, slotId) {
    await db.query(
      `UPDATE bookings SET status='cancelled', cancelled_at=now()
        WHERE slot_id=$1 AND status='confirmed'`, [slotId]);
  },
  async listForPatient(db, patientId) {
    const { rows } = await db.query(
      `SELECT b.*, s.starts_at, s.ends_at, s.clinic_id, u.name AS clinic_name
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         JOIN users u ON u.id = s.clinic_id
        WHERE b.patient_id = $1 ORDER BY s.starts_at`, [patientId]);
    return rows;
  },
};
