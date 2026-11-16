import { describe, expect, it } from 'vitest';

import { sanearVolumen, VOLUMEN_INICIAL } from './volumen';

describe('sanearVolumen', () => {
  it('sin nada guardado da el volumen inicial', () => {
    expect(sanearVolumen(null)).toEqual(VOLUMEN_INICIAL);
    expect(sanearVolumen('hola')).toEqual(VOLUMEN_INICIAL);
  });
  it('conserva un volumen válido', () => {
    expect(sanearVolumen({ musica: 0.3, efectos: 0, silencio: true })).toEqual({
      musica: 0.3,
      efectos: 0,
      silencio: true,
    });
  });
  it('deja los niveles entre 0 y 1 y arregla lo que no es un número', () => {
    expect(sanearVolumen({ musica: 4, efectos: -1, silencio: 'sí' })).toEqual({
      musica: 1,
      efectos: 0,
      silencio: false,
    });
    expect(sanearVolumen({ musica: 'alto' }).musica).toBe(1);
  });
});
