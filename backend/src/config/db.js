import pg from 'pg';
import { env } from './env.js';

// BIGINT (OID 20) comes back as a string by default; ids and counts fit safely in a JS number
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 20 });

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
