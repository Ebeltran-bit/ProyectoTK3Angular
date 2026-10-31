import { describe, expect, it } from 'vitest';

import {
  aplicarJuicio,
  cerrarNotasPasadas,
  crearPartida,
  juzgarDesfase,
  marcadorInicial,
  pulsar,
  pulsoAMs,
} from './evaluacion';

describe('juzgarDesfase', () => {
  it.each([
    [0, 'perfect'],
    [40, 'perfect'],
    [-40, 'perfect'],
    [41, 'great'],
    [-41, 'great'],
    [90, 'great'],
    [-90, 'great'],
    [91, 'miss'],
    [-91, 'miss'],
  ])('%i ms → %s', (desfase, esperado) => {
    expect(juzgarDesfase(desfase)).toBe(esperado);
  });
});

describe('pulsoAMs', () => {
  it('a 60 BPM cada pulso dura un segundo', () => {
    expect(pulsoAMs(3, 60)).toBe(3000);
  });
  it('a 120 BPM cada pulso dura medio segundo', () => {
    expect(pulsoAMs(4, 120)).toBe(2000);
  });
});

describe('aplicarJuicio', () => {
  it('PERFECT suma 300 puntos, combo y 3 de Hype', () => {
    const m = aplicarJuicio(marcadorInicial(), 'perfect');
    expect(m).toMatchObject({ puntos: 300, combo: 1, comboMaximo: 1, hype: 53, perfect: 1 });
  });
  it('GREAT suma 100 puntos y 1 de Hype', () => {
    expect(aplicarJuicio(marcadorInicial(), 'great')).toMatchObject({
      puntos: 100,
      hype: 51,
      great: 1,
    });
  });
  it('MISS rompe el combo pero conserva el combo máximo', () => {
    let m = marcadorInicial();
    m = aplicarJuicio(m, 'perfect');
    m = aplicarJuicio(m, 'great');
    m = aplicarJuicio(m, 'miss');
    expect(m).toMatchObject({ combo: 0, comboMaximo: 2, hype: 48, miss: 1, puntos: 400 });
  });
  it('el Hype no baja de 0', () => {
    let m = marcadorInicial();
    for (let i = 0; i < 20; i++) m = aplicarJuicio(m, 'miss');
    expect(m.hype).toBe(0);
  });
  it('el Hype no sube de 100', () => {
    let m = marcadorInicial();
    for (let i = 0; i < 30; i++) m = aplicarJuicio(m, 'perfect');
    expect(m.hype).toBe(100);
  });
  it('no modifica el marcador que recibe', () => {
    const m = marcadorInicial();
    aplicarJuicio(m, 'perfect');
    expect(m).toEqual(marcadorInicial());
  });
});

describe('pulsar', () => {
  const notas = [
    { ms: 1000, tecla: 'accion' as const },
    { ms: 2000, tecla: 'accion' as const },
    { ms: 3000, tecla: 'alterna' as const },
  ];

  it('juzga la nota más cercana, antes o después', () => {
    let p = crearPartida(notas);
    let r = pulsar(p, 1030, 'accion');
    expect(r.juicio).toBe('perfect');
    r = pulsar(r.partida, 1950, 'accion');
    expect(r.juicio).toBe('great');
    expect(r.partida.notas.map((n) => n.juicio)).toEqual(['perfect', 'great', null]);
  });

  it('cada nota se juzga una sola vez', () => {
    const r1 = pulsar(crearPartida(notas), 1000, 'accion');
    const r2 = pulsar(r1.partida, 1010, 'accion');
    expect(r2.juicio).toBe('miss');
    expect(r2.partida.marcador).toMatchObject({ perfect: 1, miss: 1, combo: 0 });
  });

  it('pulsar sin nota cerca es un fallo y rompe el combo', () => {
    const r1 = pulsar(crearPartida(notas), 1000, 'accion');
    const r2 = pulsar(r1.partida, 1500, 'accion');
    expect(r2.juicio).toBe('miss');
    expect(r2.partida.marcador.combo).toBe(0);
    // La nota de 2000 ms sigue disponible
    expect(r2.partida.notas[1].juicio).toBeNull();
  });

  it('la tecla equivocada cuenta como MISS en esa nota', () => {
    const r = pulsar(crearPartida(notas), 3000, 'accion');
    expect(r.juicio).toBe('miss');
    expect(r.partida.notas[2].juicio).toBe('miss');
  });

  it('K en una nota alterna es correcto', () => {
    expect(pulsar(crearPartida(notas), 3020, 'alterna').juicio).toBe('perfect');
  });

  it('no modifica la partida que recibe', () => {
    const p = crearPartida(notas);
    pulsar(p, 1000, 'accion');
    expect(p.notas[0].juicio).toBeNull();
    expect(p.marcador).toEqual(marcadorInicial());
  });
});

describe('cerrarNotasPasadas', () => {
  const notas = [
    { ms: 1000, tecla: 'accion' as const },
    { ms: 2000, tecla: 'accion' as const },
  ];

  it('una nota sin pulsar es MISS cuando pasa su ventana', () => {
    const p = crearPartida(notas);
    expect(cerrarNotasPasadas(p, 1090).fallos).toBe(0);
    const r = cerrarNotasPasadas(p, 1091);
    expect(r.fallos).toBe(1);
    expect(r.partida.notas[0].juicio).toBe('miss');
    expect(r.partida.marcador.miss).toBe(1);
  });

  it('no vuelve a juzgar notas ya juzgadas', () => {
    const p = pulsar(crearPartida(notas), 1000, 'accion').partida;
    const r = cerrarNotasPasadas(p, 5000);
    expect(r.fallos).toBe(1);
    expect(r.partida.marcador).toMatchObject({ perfect: 1, miss: 1 });
  });
});

describe('una canción de ejemplo completa', () => {
  it('suma puntos, aciertos, fallos y combo máximo', () => {
    const notas = [0, 500, 1000, 1500, 2000].map((ms) => ({ ms, tecla: 'accion' as const }));
    let p = crearPartida(notas);
    p = pulsar(p, 10, 'accion').partida; // PERFECT
    p = pulsar(p, 560, 'accion').partida; // GREAT
    p = pulsar(p, 990, 'accion').partida; // PERFECT
    // la de 1500 no se pulsa
    p = cerrarNotasPasadas(p, 1700).partida; // MISS
    p = pulsar(p, 2000, 'accion').partida; // PERFECT
    expect(p.marcador).toEqual({
      puntos: 1000,
      combo: 1,
      comboMaximo: 3,
      hype: 50 + 3 + 1 + 3 - 6 + 3,
      perfect: 3,
      great: 1,
      miss: 1,
    });
  });
});
