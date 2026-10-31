import { describe, expect, it } from 'vitest';

import { frecuencia } from './musica';

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
