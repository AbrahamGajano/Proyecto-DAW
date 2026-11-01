import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import argon2 from 'argon2';
import pino from 'pino';
import { createApp } from '../server/app.js';
import { requireAdmin } from '../server/auth.js';

let db;
let pool;
let app;
const account = { nombreUsuario: 'Abraham', email: 'abraham@example.test', contrasena: 'Una frase de prueba 123' };
const login = { email: account.email, contrasena: account.contrasena };

beforeEach(async () => {
  // BD nueva e independiente en cada prueba. Nunca usa DATABASE_URL ni datos de desarrollo.
  db = new PGlite();
  await db.exec(await readFile(new URL('../db/abraham/010_usuario.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/abraham/020_recuperacion.sql', import.meta.url), 'utf8'));
  pool = {
    async query(sql, values) {
      // pg admite varios statements sin parámetros; PGlite los ejecuta con exec.
      if (!values?.length && sql.includes(';')) {
        const results = await db.exec(sql);
        return results.at(-1);
      }
      return db.query(sql, values);
    },
  };
  app = await createApp({
    pool,
    sessionSecret: 'secreto-de-pruebas-aisladas-123456789',
    appOrigin: 'http://localhost:3000',
    logger: pino({ level: 'silent' }),
    configureRoutes(app, { requireAuth }) {
      app.get('/api/prueba/admin', requireAuth, requireAdmin, (req, res) => res.json({ data: req.user }));
    },
  });
});

afterEach(async () => {
  await app?.locals.sessionStore.close();
  await db?.close();
});

async function register() {
  return request(app).post('/api/auth/registro').send(account).expect(201);
}

async function loggedAgent() {
  await register();
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(login).expect(200);
  return agent;
}

describe('registro y validación', () => {
  it('guarda Argon2id, fuerza rol usuario y no inicia sesión ni expone datos privados', async () => {
    const response = await register();
    expect(response.body.data).toEqual({ id: expect.any(String), nombreUsuario: 'Abraham', rol: 'usuario', pilotoFavoritoId: null });
    expect(response.headers['set-cookie']).toBeUndefined();
    const { rows: [user] } = await db.query('SELECT * FROM usuario');
    expect(user.contrasena_hash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(user.contrasena_hash, account.contrasena)).toBe(true);
    expect(user.rol).toBe('usuario');
  });

  it.each([
    { ...account, nombreUsuario: ' ' },
    { ...account, email: 'no-es-email' },
    { ...account, contrasena: 'corta' },
    { ...account, contrasena: 'a'.repeat(129) },
    { ...account, rol: 'admin' },
    { ...account, pilotoFavoritoId: '1' },
  ])('rechaza datos inválidos sin insertar: %j', async body => {
    const response = await request(app).post('/api/auth/registro').send(body).expect(400);
    expect(response.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect((await db.query('SELECT * FROM usuario')).rows).toHaveLength(0);
  });

  it.each([
    { ...account, nombreUsuario: 'ABRAHAM', email: 'otro@example.test' },
    { ...account, nombreUsuario: 'Otro', email: 'ABRAHAM@EXAMPLE.TEST' },
  ])('rechaza duplicados ignorando mayúsculas y conserva la cuenta existente', async body => {
    await register();
    const before = (await db.query('SELECT * FROM usuario')).rows;
    await request(app).post('/api/auth/registro').send(body).expect(409);
    expect((await db.query('SELECT * FROM usuario')).rows).toEqual(before);
  });

  it('recorta nombre/email y conserva los espacios de la contraseña', async () => {
    const password = '  frase con espacios  ';
    await request(app).post('/api/auth/registro').send({ ...account, nombreUsuario: '  Abraham  ', email: '  ABRAHAM@example.test  ', contrasena: password }).expect(201);
    const { rows: [user] } = await db.query('SELECT * FROM usuario');
    expect(user.nombre_usuario).toBe('Abraham');
    expect(user.email).toBe(account.email);
    expect(await argon2.verify(user.contrasena_hash, password)).toBe(true);
  });
});

describe('sesiones y permisos', () => {
  it('sin sesión da 401, no crea cookies ni cambia usuarios', async () => {
    const response = await request(app).get('/api/auth/yo').expect(401);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect((await db.query('SELECT * FROM usuario')).rows).toHaveLength(0);
    await request(app).get('/api/prueba/admin').expect(401);
  });

  it('login, sesión persistida en PostgreSQL, consulta y logout; la cookie antigua deja de servir', async () => {
    await register();
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/login').send(login).expect(200);
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const sessions = (await db.query('SELECT sess FROM session')).rows;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sess.usuarioId).toBe(response.body.data.id);
    expect(JSON.stringify(sessions)).not.toContain(account.contrasena);
    await agent.get('/api/auth/yo').expect(200);
    await agent.post('/api/auth/logout').send({}).expect(204);
    expect((await db.query('SELECT * FROM session')).rows).toHaveLength(0);
    await agent.get('/api/auth/yo').expect(401);
    await request(app).get('/api/auth/yo').set('Cookie', cookie.split(';')[0]).expect(401);
  });

  it('login repetido regenera el identificador e invalida la sesión anterior', async () => {
    const agent = await loggedAgent();
    const oldSession = (await db.query('SELECT sid FROM session')).rows[0].sid;
    await agent.post('/api/auth/login').send(login).expect(200);
    const sessions = (await db.query('SELECT sid FROM session')).rows;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sid).not.toBe(oldSession);
  });

  it('contraseña incorrecta y email inexistente dan el mismo error sin cambiar datos', async () => {
    await register();
    const before = (await db.query('SELECT * FROM usuario')).rows;
    const a = await request(app).post('/api/auth/login').send({ ...login, contrasena: 'Incorrecta' }).expect(401);
    const b = await request(app).post('/api/auth/login').send({ ...login, email: 'nadie@example.test' }).expect(401);
    expect(a.body).toEqual(b.body);
    expect(a.headers['set-cookie']).toBeUndefined();
    expect((await db.query('SELECT * FROM usuario')).rows).toEqual(before);
  });

  it('un usuario recibe 403; el rol actual de admin se comprueba en BD', async () => {
    const agent = await loggedAgent();
    const before = (await db.query('SELECT * FROM usuario')).rows;
    await agent.get('/api/prueba/admin').expect(403);
    expect((await db.query('SELECT * FROM usuario')).rows).toEqual(before);
    await db.query("UPDATE usuario SET rol = 'admin'");
    await agent.get('/api/prueba/admin').expect(200);
    await db.query("UPDATE usuario SET rol = 'usuario'");
    await agent.get('/api/prueba/admin').expect(403);
  });

  it('una cuenta eliminada pierde el acceso y su sesión se destruye', async () => {
    const agent = await loggedAgent();
    await db.query('DELETE FROM usuario');
    await agent.get('/api/auth/yo').expect(401);
    expect((await db.query('SELECT * FROM session')).rows).toHaveLength(0);
  });

  it('logout sin sesión es válido', async () => {
    await request(app).post('/api/auth/logout').send({}).expect(204);
  });

  it('una sesión caducada no permite acceder', async () => {
    const agent = await loggedAgent();
    await db.query("UPDATE session SET expire = CURRENT_TIMESTAMP - INTERVAL '1 minute'");
    await agent.get('/api/auth/yo').expect(401);
  });
});

describe('HTTP e integración', () => {
  it('rechaza otro origen y formularios externos sin crear cuentas', async () => {
    await request(app).post('/api/auth/registro').set('Origin', 'https://otro.example').send(account).expect(403);
    await request(app).post('/api/auth/registro').set('Sec-Fetch-Site', 'cross-site').send(account).expect(403);
    await request(app).post('/api/auth/registro').type('form').send(account).expect(400);
    expect((await db.query('SELECT * FROM usuario')).rows).toHaveLength(0);
  });

  it('acepta el origen configurado y devuelve errores de JSON controlados', async () => {
    await request(app).post('/api/auth/registro').set('Origin', 'http://localhost:3000').send(account).expect(201);
    const response = await request(app).post('/api/auth/login').type('json').send('{').expect(400);
    expect(response.body.error.codigo).toBe('JSON_INVALIDO');
  });

  it('no revela detalles SQL ni hashes ante un fallo interno', async () => {
    pool.query = async () => { throw new Error('password=secreto SQL privado'); };
    const response = await request(app).post('/api/auth/login').send(login).expect(500);
    expect(JSON.stringify(response.body)).not.toMatch(/secreto|SQL|stack/);
  });

  it('limita intentos repetidos de autenticación', async () => {
    for (let i = 0; i < 50; i++) await request(app).post('/api/auth/login').send({}).expect(400);
    const response = await request(app).post('/api/auth/login').send({}).expect(429);
    expect(response.body.error.codigo).toBe('DEMASIADOS_INTENTOS');
  });

  it.each(['/', '/registro.html', '/login.html'])('sirve la pantalla %s con política de seguridad', async path => {
    const response = await request(app).get(path).expect(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('lang="es"');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
  });
});
