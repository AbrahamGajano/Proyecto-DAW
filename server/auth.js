import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';

export const cookieName = 'porragp.sid';

export function publicUser(row) {
  return {
    id: String(row.id),
    nombreUsuario: row.nombre_usuario,
    rol: row.rol,
    pilotoFavoritoId: row.piloto_favorito_id == null ? null : String(row.piloto_favorito_id),
  };
}

export class ApiError extends Error {
  constructor(status, codigo, mensaje, campos) {
    super(mensaje);
    Object.assign(this, { status, codigo, campos });
  }
}

// Carga el rol actual de la BD: no confiar en un rol antiguo guardado en la cookie.
export function createRequireAuth(pool) {
  return async function requireAuth(req, res, next) {
    if (!req.session.usuarioId) {
      throw new ApiError(401, 'SIN_SESION', 'Inicia sesión para continuar.');
    }
    const { rows } = await pool.query('SELECT id, nombre_usuario, rol, piloto_favorito_id FROM usuario WHERE id = $1', [req.session.usuarioId]);
    if (!rows[0]) {
      await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
      throw new ApiError(401, 'SIN_SESION', 'Inicia sesión para continuar.');
    }
    req.user = publicUser(rows[0]);
    next();
  };
}

// Usar después de requireAuth.
export function requireAdmin(req, res, next) {
  if (!req.user) throw new ApiError(401, 'SIN_SESION', 'Inicia sesión para continuar.');
  if (req.user.rol !== 'admin') throw new ApiError(403, 'SIN_PERMISO', 'Necesitas permisos de administrador.');
  next();
}

const email = z.string().trim().max(254).email('Introduce un email válido.');
const password = z.string().min(8, 'Usa al menos 8 caracteres.').max(128, 'Usa como máximo 128 caracteres.');
const registerSchema = z.strictObject({
  nombreUsuario: z.string().trim().min(1, 'Introduce tu nombre.').max(50, 'Usa como máximo 50 caracteres.'),
  email,
  contrasena: password,
});
const loginSchema = z.strictObject({ email, contrasena: z.string().min(1, 'Introduce tu contraseña.').max(128) });

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const campos = {};
    for (const issue of result.error.issues) {
      if (issue.path[0] && !campos[issue.path[0]]) campos[issue.path[0]] = issue.message;
    }
    throw new ApiError(400, 'DATOS_INVALIDOS', 'Revisa los campos. Solo se admiten los campos del formulario.', campos);
  }
  return result.data;
}

export async function createAuthRouter({ pool, requireAuth, cookieSecure }) {
  const router = Router();
  // Se calcula una vez para que el login también verifique un hash si no existe el email.
  const dummyHash = await argon2.hash('cuenta-inexistente', { type: argon2.argon2id });
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Vuelve a probar en unos minutos.' } }),
  });

  router.post('/registro', limit, async (req, res) => {
    const data = validate(registerSchema, req.body);
    const hash = await argon2.hash(data.contrasena, { type: argon2.argon2id });
    try {
      const { rows } = await pool.query(
        "INSERT INTO usuario (nombre_usuario, email, contrasena_hash, rol) VALUES ($1, $2, $3, 'usuario') RETURNING id, nombre_usuario, rol, piloto_favorito_id",
        [data.nombreUsuario, data.email.toLowerCase(), hash],
      );
      req.log.info({ usuarioId: String(rows[0].id), evento: 'registro' }, 'Cuenta creada');
      res.status(201).json({ data: publicUser(rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        const field = error.constraint === 'usuario_nombre_unico' ? 'nombreUsuario' : 'email';
        throw new ApiError(409, 'CUENTA_DUPLICADA', 'El nombre o el email ya están registrados.', { [field]: 'Este valor ya está registrado.' });
      }
      throw error;
    }
  });

  router.post('/login', limit, async (req, res) => {
    const data = validate(loginSchema, req.body);
    const { rows } = await pool.query('SELECT id, nombre_usuario, rol, piloto_favorito_id, contrasena_hash FROM usuario WHERE LOWER(email) = LOWER($1)', [data.email]);
    const user = rows[0];
    const valid = await argon2.verify(user?.contrasena_hash ?? dummyHash, data.contrasena);
    if (!user || !valid) {
      req.log.warn({ evento: 'login_fallido' }, 'Credenciales incorrectas');
      throw new ApiError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos.');
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.usuarioId = String(user.id);
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    req.log.info({ usuarioId: String(user.id), evento: 'login' }, 'Sesión iniciada');
    res.json({ data: publicUser(user) });
  });

  router.post('/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie(cookieName, { path: '/', httpOnly: true, sameSite: 'lax', secure: cookieSecure });
    res.status(204).end();
  });

  router.get('/yo', requireAuth, (req, res) => res.json({ data: req.user }));
  return router;
}
