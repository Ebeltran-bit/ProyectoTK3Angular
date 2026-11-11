import { describe, expect, it } from 'vitest';

import {
  acercar,
  arco,
  frenar,
  golpe,
  limitar,
  mezclar,
  parpadeo,
  rebote,
  suave,
  tramo,
} from './animacion';

describe('curvas de animación', () => {
  it('limitar deja el valor dentro del rango', () => {
    expect(limitar(-2)).toBe(0);
    expect(limitar(0.4)).toBe(0.4);
    expect(limitar(7, 1, 3)).toBe(3);
  });

  it('mezclar da los extremos y el punto medio', () => {
    expect(mezclar(10, 20, 0)).toBe(10);
    expect(mezclar(10, 20, 1)).toBe(20);
    expect(mezclar(10, 20, 0.5)).toBe(15);
  });

  it('tramo avanza de 0 a 1 y funciona al revés (cuenta atrás)', () => {
    expect(tramo(5, 0, 10)).toBe(0.5);
    expect(tramo(-1, 0, 10)).toBe(0);
    expect(tramo(11, 0, 10)).toBe(1);
    // De 0,6 pulsos que faltan a 0,1: cuanto menos falta, más avanzado
    expect(tramo(0.6, 0.6, 0.1)).toBe(0);
    expect(tramo(0.1, 0.6, 0.1)).toBe(1);
  });

  it('todas las curvas empiezan en 0 y acaban en 1', () => {
    for (const curva of [suave, frenar, rebote]) {
      expect(curva(0)).toBeCloseTo(0);
      expect(curva(1)).toBeCloseTo(1);
    }
  });

  it('rebote se pasa de 1 antes de volver', () => {
    expect(rebote(0.7)).toBeGreaterThan(1);
  });

  it('golpe empieza en 1, se apaga y vale 0 fuera de su duración', () => {
    expect(golpe(0, 0.5)).toBe(1);
    expect(golpe(0.25, 0.5)).toBeCloseTo(0.25);
    expect(golpe(0.5, 0.5)).toBe(0);
    expect(golpe(-0.1, 0.5)).toBe(0);
  });

  it('acercar llega al mismo sitio a 30 y a 60 fotogramas por segundo', () => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 30; i++) a = acercar(a, 1, 8, 1 / 30);
    for (let i = 0; i < 60; i++) b = acercar(b, 1, 8, 1 / 60);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeGreaterThan(0.99);
  });

  it('parpadeo cierra los ojos un instante en cada ciclo', () => {
    expect(parpadeo(0.07)).toBeCloseTo(1);
    expect(parpadeo(1)).toBe(0);
    expect(parpadeo(3.4 + 0.07)).toBeCloseTo(1);
  });

  it('arco vale 0 en los extremos y 1 en el centro', () => {
    expect(arco(0)).toBe(0);
    expect(arco(0.5)).toBe(1);
    expect(arco(1)).toBe(0);
  });
});
