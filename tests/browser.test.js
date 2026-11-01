import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import pino from 'pino';
import { createApp } from '../server/app.js';

let browser;
let db;
let server;
let app;
let origin;

beforeAll(async () => {
  db = new PGlite();
  for (const file of ['010_usuario.sql', '020_recuperacion.sql']) {
    await db.exec(await readFile(new URL(`../db/abraham/${file}`, import.meta.url), 'utf8'));
  }
  const pool = {
    async query(sql, values) {
      if (!values?.length && sql.includes(';')) return (await db.exec(sql)).at(-1);
      return db.query(sql, values);
    },
  };
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  app = await createApp({ pool, sessionSecret: 'secreto-de-pruebas-navegador-12345678', appOrigin: origin, logger: pino({ level: 'silent' }) });
  server.on('request', app);
  browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() });
}, 30000);

afterAll(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await app?.locals.sessionStore.close();
  await db?.close();
});

it.each([
  { name: 'escritorio', viewport: { width: 1280, height: 800 } },
  { name: 'móvil', viewport: { width: 390, height: 844 } },
])('registro, errores, login y logout en $name, sin fallos axe A/AA', async ({ name, viewport }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const path of ['/', '/registro.html', '/login.html']) {
      await page.goto(`${origin}${path}`);
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.goto(`${origin}/registro.html`);
    await page.keyboard.press('Tab');
    expect(await page.locator('.saltar').evaluate(element => element === document.activeElement)).toBe(true);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.locator('#nombreUsuario[aria-invalid="true"]').waitFor();
    expect(await page.locator('#nombreUsuario').evaluate(element => element === document.activeElement)).toBe(true);
    await page.getByLabel('Nombre de usuario').fill(`Abraham ${name}`);
    await page.getByLabel('Email', { exact: true }).fill(`${name === 'móvil' ? 'movil' : 'desktop'}@example.test`);
    await page.getByLabel('Contraseña', { exact: true }).fill('Una contraseña de prueba');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.getByRole('status').filter({ hasText: 'Cuenta creada.' }).waitFor();
    await page.getByRole('link', { name: 'Inicia sesión' }).click();
    const emailInput = page.getByLabel('Email', { exact: true });
    await emailInput.fill(`${name === 'móvil' ? 'movil' : 'desktop'}@example.test`);
    await emailInput.press('Tab');
    expect(await page.locator('#contrasena').evaluate(element => element === document.activeElement)).toBe(true);
    await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.getByRole('status').filter({ hasText: 'Email o contraseña incorrectos.' }).waitFor();
    await page.getByLabel('Contraseña', { exact: true }).fill('Una contraseña de prueba');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(`${origin}/`);
    await page.getByText(`Hola, Abraham ${name}. Has iniciado sesión.`, { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Cerrar sesión' }).waitFor();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('status').filter({ hasText: 'Has cerrado sesión.' }).waitFor();
    await page.reload();
    await page.getByRole('link', { name: 'Crear cuenta' }).waitFor();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
}, 30000);
