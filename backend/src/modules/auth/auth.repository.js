const PUBLIC = 'id, email, name, role, created_at';

export const authRepo = {
  async insert(db, { email, passwordHash, name, role }) {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1,$2,$3,$4) RETURNING ${PUBLIC}`,
      [email, passwordHash, name, role]);
    return rows[0];
  },
  async findByEmail(db, email) {
    const { rows } = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return rows[0];
  },
  async findById(db, id) {
    const { rows } = await db.query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id]);
    return rows[0];
  },
};
