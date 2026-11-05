import { describe, expect, it } from 'vitest';
import {
  calcularFase,
  obtenerCarreraAbierta,
} from '../server/fases.js';

describe('fase de una carrera', () => {
  const carrera = {
    cancelada: false,
    tieneResultado: false,
    horaCierre: '2026-11-08T14:00:00Z',
  };

  const antes = new Date('2026-11-08T13:59:59Z');

  it('está pendiente si la anterior no está resuelta', () => {
    expect(calcularFase(carrera, false, antes)).toBe('pendiente');
  });

  it('está abierta un segundo antes del cierre', () => {
    expect(calcularFase(carrera, true, antes)).toBe('abierta');
  });

  it('está cerrada a la hora exacta del cierre', () => {
    const ahora = new Date('2026-11-08T14:00:00Z');

    expect(calcularFase(carrera, true, ahora)).toBe('cerrada');
  });

  it('está finalizada si tiene resultado', () => {
    const finalizada = { ...carrera, tieneResultado: true };

    expect(calcularFase(finalizada, true, antes)).toBe('finalizada');
  });

  it('está cancelada aunque tenga resultado', () => {
    const cancelada = {
      ...carrera,
      cancelada: true,
      tieneResultado: true,
    };

    expect(calcularFase(cancelada, true, antes)).toBe('cancelada');
  });
});
describe('carrera abierta', () => {
  const ahora = new Date('2026-11-08T13:00:00Z');

  const primera = {
    id: '1',
    cancelada: false,
    tieneResultado: false,
    horaCierre: '2026-11-08T14:00:00Z',
  };

  const segunda = {
    id: '2',
    cancelada: false,
    tieneResultado: false,
    horaCierre: '2026-11-15T14:00:00Z',
  };

  it('devuelve la primera carrera si está abierta', () => {
    const resultado = obtenerCarreraAbierta(
      [primera, segunda],
      ahora,
    );

    expect(resultado.id).toBe('1');
  });

  it('pasa a la siguiente si la anterior tiene resultado', () => {
    const terminada = { ...primera, tieneResultado: true };

    const resultado = obtenerCarreraAbierta(
      [terminada, segunda],
      ahora,
    );

    expect(resultado.id).toBe('2');
  });

  it('pasa a la siguiente si la anterior está cancelada', () => {
    const cancelada = { ...primera, cancelada: true };

    const resultado = obtenerCarreraAbierta(
      [cancelada, segunda],
      ahora,
    );

    expect(resultado.id).toBe('2');
  });

  it('no abre la siguiente si la anterior está cerrada sin resultado', () => {
    const cierre = new Date('2026-11-08T14:00:00Z');

    expect(
      obtenerCarreraAbierta([primera, segunda], cierre),
    ).toBeNull();
  });

  it('devuelve null si todas están resueltas', () => {
    const terminada = { ...primera, tieneResultado: true };
    const cancelada = { ...segunda, cancelada: true };

    expect(
      obtenerCarreraAbierta([terminada, cancelada], ahora),
    ).toBeNull();
  });

  it('devuelve null si no hay carreras', () => {
    expect(obtenerCarreraAbierta([], ahora)).toBeNull();
  });
});

