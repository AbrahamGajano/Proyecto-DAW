import pg from 'pg';
import { readFile } from 'node:fs/promises';

if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  // Cada SQL contiene su propia transacción; usar la misma conexión para ejecutarlo.
  for (const file of ['010_usuario.sql', '020_recuperacion.sql']) {
    await client.query(await readFile(new URL(`../db/abraham/${file}`, import.meta.url), 'utf8'));
  }
  process.stdout.write('Tablas de Abraham creadas. No vuelvas a ejecutar este comando sobre la misma BD.\n');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
