import { describe, expect, it } from 'vitest';

import { Cancion } from '../models/cancion';
import { demostracionDe } from './demostracion';

/** Canción mínima: solo importan las notas, el compás y el aviso. */
function cancion(notas: [number, 'accion' | 'alterna'][], avisoAntes = 1): Cancion {
  return {
    notas: notas.map(([pulso, tecla]) => ({ pulso, tecla })),
    pulsos_por_compas: 4,
    aviso_antes: avisoAntes,
  } as Cancion;
}

describe('demostracionDe', () => {
  it('toma las notas del primer compás con notas', () => {
    const d = demostracionDe(
      cancion([
        [4, 'accion'],
        [6, 'accion'],
        [8, 'accion'],
      ]),
    );
    expect(d?.notas.map((n) => n.pulso)).toEqual([4, 6]);
  });

  it('empieza un pulso antes del primer aviso y acaba uno después de la última nota', () => {
    const d = demostracionDe(
      cancion([
        [4, 'accion'],
        [6, 'accion'],
      ]),
    );
    expect(d).toMatchObject({ desde: 2, hasta: 7 });
  });

  it('con llamada y respuesta (aviso 4 pulsos antes) dura más', () => {
    // Como la barbería: avisos en 4, 5 y 6; notas en 8, 9 y 10
    const d = demostracionDe(
      cancion(
        [
          [8, 'accion'],
          [9, 'accion'],
          [10, 'alterna'],
          [12, 'accion'],
        ],
        4,
      ),
    );
    expect(d?.notas.map((n) => n.tecla)).toEqual(['accion', 'accion', 'alterna']);
    expect(d).toMatchObject({ desde: 3, hasta: 11 });
  });

  it('sin notas no hay demostración', () => {
    expect(demostracionDe(cancion([]))).toBeNull();
  });
});
