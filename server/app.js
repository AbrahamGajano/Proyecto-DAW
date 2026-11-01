import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'node:url';
import { ApiError, cookieName, createAuthRouter, createRequireAuth, requireAdmin } from './auth.js';

// La conexión es inyectable para compartir la de Álvaro y aislar la BD de pruebas.
export async function createApp({ pool, sessionSecret, appOrigin, cookieSecure = false, logger = pino({ level: process.env.LOG_LEVEL ?? 'info' }), configureRoutes }) {
  if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  const origin = new URL(appOrigin).origin;
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({
    logger,
    serializers: {
      req: req => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
      res: res => ({ statusCode: res.statusCode }),
    },
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') {
        throw new ApiError(403, 'ORIGEN_NO_PERMITIDO', 'Origen de petición no permitido.');
      }
      // JSON fuerza preflight en navegadores de otro origen; no se habilita CORS.
      if (!req.is('application/json')) throw new ApiError(400, 'FORMATO_INVALIDO', 'Envía la petición como application/json.');
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  const PgStore = connectPgSimple(session);
  const sessionStore = new PgStore({
    pool,
    createTableIfMissing: true,
    errorLog: () => logger.error({ evento: 'error_sesiones' }, 'Error en el almacenamiento de sesiones'),
  });
  app.locals.sessionStore = sessionStore;
  app.use(session({
    store: sessionStore,
    name: cookieName,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: cookieSecure, maxAge: 8 * 60 * 60 * 1000 },
  }));
  const requireAuth = createRequireAuth(pool);
  // Exportación y acceso para las rutas que añadan los compañeros.
  app.locals.requireAuth = requireAuth;
  app.locals.requireAdmin = requireAdmin;
  app.use('/api/auth', await createAuthRouter({ pool, requireAuth, cookieSecure }));
  configureRoutes?.(app, { requireAuth, requireAdmin });
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
  app.use((req, res, next) => next(new ApiError(404, 'NO_ENCONTRADO', 'No se ha encontrado este recurso.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') error = new ApiError(400, 'JSON_INVALIDO', 'El JSON no es válido.');
    if (error.type === 'entity.too.large') error = new ApiError(413, 'PETICION_GRANDE', 'La petición es demasiado grande.');
    const known = error instanceof ApiError;
    // Evitar detalles SQL de excepciones, que pueden incluir valores sensibles.
    if (!known) req.log.error({ evento: 'error_servidor', tipo: error.name }, 'Error interno del servidor');
    else if (error.status >= 400) req.log.warn({ codigo: error.codigo }, error.message);
    res.status(known ? error.status : 500).json({
      error: {
        codigo: known ? error.codigo : 'ERROR_INTERNO',
        mensaje: known ? error.message : 'Ha ocurrido un error. Inténtalo de nuevo.',
        ...(known && error.campos ? { campos: error.campos } : {}),
      },
    });
  });
  return app;
}
