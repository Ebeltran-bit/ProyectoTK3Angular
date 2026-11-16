import { describe, expect, it } from 'vitest';

import { frecuencia, pulsosCuentaAlVolver } from './musica';

describe('frecuencia', () => {
  it('el La 69 es 440 Hz', () => {
    expect(frecuencia(69)).toBe(440);
  });
  it('una octava más arriba es el doble', () => {
    expect(frecuencia(81)).toBeCloseTo(880);
  });
  it('el Do central 60 está en unos 261,6 Hz', () => {
    expect(frecuencia(60)).toBeCloseTo(261.63, 1);
  });
});

describe('pulsosCuentaAlVolver', () => {
  it('cuenta los pulsos enteros justo antes del punto de la pausa', () => {
    expect(pulsosCuentaAlVolver(10.5, 4)).toEqual([7, 8, 9, 10]);
  });
  it('si se paró justo en un pulso, ese pulso es donde vuelve la canción', () => {
    expect(pulsosCuentaAlVolver(12, 4)).toEqual([8, 9, 10, 11]);
  });
  it('usa los pulsos del compás de la canción', () => {
    expect(pulsosCuentaAlVolver(6.2, 3)).toEqual([4, 5, 6]);
  });
});
