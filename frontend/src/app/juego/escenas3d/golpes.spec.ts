import { describe, expect, it } from 'vitest';

import { VistaEscena } from '../escenarios/tipos';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';

/** Vista a 120 pulsos por minuto (2 pulsos por segundo) con tres notas. */
function vista(cambios: Partial<VistaEscena>): VistaEscena {
  return {
    segundos: 0,
    pulso: 0,
    bpm: 120,
    notas: [
      { pulso: 4, juicio: null },
      { pulso: 6, juicio: null },
      { pulso: 8, juicio: null },
    ],
    teclas: ['accion', 'accion', 'accion'],
    desdePulsacion: Infinity,
    ultimaTecla: null,
    ...cambios,
  };
}

describe('ultimaJuzgada', () => {
  it('no hay ninguna al empezar', () => {
    expect(ultimaJuzgada(vista({ pulso: 4.2 }), 1)).toBeNull();
  });

  it('devuelve la más reciente con su juicio y cuánto hace', () => {
    const v = vista({
      pulso: 6.5,
      notas: [
        { pulso: 4, juicio: 'perfect' },
        { pulso: 6, juicio: 'miss' },
        { pulso: 8, juicio: null },
      ],
    });
    expect(ultimaJuzgada(v, 1)).toEqual({ indice: 1, juicio: 'miss', hace: 0.5 });
  });

  it('deja de contar cuando pasa la duración pedida', () => {
    const v = vista({ pulso: 5.5, notas: [{ pulso: 4, juicio: 'great' }] });
    expect(ultimaJuzgada(v, 1)).toBeNull();
    expect(ultimaJuzgada(v, 2)?.indice).toBe(0);
  });
});

describe('notaAcertada', () => {
  it('es null si no se ha pulsado', () => {
    expect(notaAcertada(vista({ pulso: 5 }))).toBeNull();
  });

  it('encuentra la nota que acertó la última pulsación', () => {
    // Se pulsó hace 0,1 s (0,2 pulsos) en el pulso 4,02: acierta la nota del pulso 4
    const v = vista({
      pulso: 4.22,
      desdePulsacion: 0.1,
      notas: [
        { pulso: 4, juicio: 'perfect' },
        { pulso: 6, juicio: null },
      ],
    });
    expect(notaAcertada(v)).toBe(0);
  });

  it('es null si la pulsación cayó lejos de cualquier nota acertada', () => {
    // Se pulsó en el pulso 5: la nota 4 estaba acertada de antes, pero no por esta pulsación
    const v = vista({
      pulso: 5.2,
      desdePulsacion: 0.1,
      notas: [
        { pulso: 4, juicio: 'perfect' },
        { pulso: 6, juicio: null },
      ],
    });
    expect(notaAcertada(v)).toBeNull();
  });

  it('es null si la nota cercana quedó como fallo (tecla equivocada)', () => {
    const v = vista({ pulso: 4.2, desdePulsacion: 0.1, notas: [{ pulso: 4, juicio: 'miss' }] });
    expect(notaAcertada(v)).toBeNull();
  });
});

describe('latido', () => {
  it('vale 1 en cada pulso y baja hasta el siguiente', () => {
    expect(latido(3)).toBe(1);
    expect(latido(3.5)).toBeCloseTo(0.125);
    expect(latido(3.99)).toBeLessThan(0.001);
  });
});
