import pg from 'pg';
import { createApp } from './app.js';

if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', () => process.stderr.write('Error de conexión a PostgreSQL.\n'));
await pool.query('SELECT 1');
const port = Number(process.env.PORT ?? 3000);
const app = await createApp({
  pool,
  sessionSecret: process.env.SESSION_SECRET,
  appOrigin: process.env.APP_ORIGIN ?? `http://localhost:${port}`,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
});
const server = app.listen(port, () => process.stdout.write(`PorraGP: ${process.env.APP_ORIGIN ?? `http://localhost:${port}`}\n`));
async function shutdown() {
  server.close(async () => {
    await app.locals.sessionStore.close();
    await pool.end();
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
