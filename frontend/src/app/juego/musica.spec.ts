import { describe, expect, it } from 'vitest';

import { frecuencia, pulsosCuentaAlVolver, volumenEnLaMezcla } from './musica';
import { RELLENO_SIN_NOTA } from './reglas';

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

describe('volumenEnLaMezcla', () => {
  const conNota = new Set([4, 5, 13.5]);

  it('baja el relleno a contratiempo donde no hay nota', () => {
    expect(volumenEnLaMezcla('maraca', 4.5, conNota)).toBe(RELLENO_SIN_NOTA);
    expect(volumenEnLaMezcla('charles', 12.5, conNota)).toBe(RELLENO_SIN_NOTA);
  });

  it('deja igual el relleno a contratiempo si allí hay nota', () => {
    expect(volumenEnLaMezcla('bajo_redondo', 13.5, conNota)).toBe(1);
  });

  it('deja igual los pulsos enteros, haya nota o no', () => {
    expect(volumenEnLaMezcla('maraca', 6, conNota)).toBe(1);
  });

  it('no toca la melodía ni el bombo', () => {
    expect(volumenEnLaMezcla('marimba', 4.5, conNota)).toBe(1);
    expect(volumenEnLaMezcla('flauta_suave', 4.5, conNota)).toBe(1);
    expect(volumenEnLaMezcla('bombo', 4.5, conNota)).toBe(1);
  });
});
