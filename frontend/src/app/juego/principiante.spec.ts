import { describe, expect, it } from 'vitest';

import { marcasDeLaRegla, rayasDeLaRegla } from './principiante';

describe('marcasDeLaRegla', () => {
  it('marca las notas entre dos pulsos como a contratiempo', () => {
    const marcas = marcasDeLaRegla([
      { pulso: 4, tecla: 'accion' },
      { pulso: 4.5, tecla: 'alterna' },
    ]);
    expect(marcas).toEqual([
      { pulso: 4, aContratiempo: false, tecla: 'accion' },
      { pulso: 4.5, aContratiempo: true, tecla: 'alterna' },
    ]);
  });
});

describe('rayasDeLaRegla', () => {
  it('pone una raya por pulso y marca el inicio de cada compás', () => {
    const rayas = rayasDeLaRegla(4, 12, 4);
    expect(rayas.map((r) => r.pulso)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rayas.filter((r) => r.compas).map((r) => r.pulso)).toEqual([4, 8, 12]);
  });
});
