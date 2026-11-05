import { describe, expect, it } from 'vitest';

import { ladosDeLasEstrellas } from './observatorio';
import { tandas } from './ramen';

describe('ladosDeLasEstrellas', () => {
  it('en la primera mitad cambia de lado en cada compás de 4 pulsos', () => {
    expect(ladosDeLasEstrellas([4, 5, 8, 9.5, 12])).toEqual([
      'derecha',
      'derecha',
      'izquierda',
      'izquierda',
      'derecha',
    ]);
  });

  it('en la segunda mitad alterna nota a nota', () => {
    expect(ladosDeLasEstrellas([34, 36, 36.5, 37, 40])).toEqual([
      'izquierda',
      'izquierda',
      'derecha',
      'izquierda',
      'derecha',
    ]);
  });
});

describe('tandas del ramen', () => {
  it('agrupa los cortes que terminan en cada K', () => {
    const lista = tandas(['accion', 'accion', 'alterna', 'accion', 'alterna']);
    expect(lista.map((t) => [t.cortes, t.olla])).toEqual([
      [[0, 1], 2],
      [[3], 4],
    ]);
    expect(lista[0].verdura.nombre).not.toBe(lista[1].verdura.nombre);
  });
});
