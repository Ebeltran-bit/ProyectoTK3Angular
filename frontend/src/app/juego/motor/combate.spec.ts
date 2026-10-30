import { describe, expect, it } from 'vitest';
import { Apariencia } from '../sprites/apariencia';
import {
  actualizarCombate,
  Combate,
  crearCombate,
  Entrada,
  golpeActivo,
  resolverGolpe,
  segundosRestantes,
  SIN_ENTRADA,
} from './combate';
import {
  ATAQUES,
  COMBATE,
  ENERGIA_MAXIMA,
  ESCENARIO,
  FISICA,
  TICKS_POR_SEGUNDO,
  VIDA_MAXIMA,
} from './reglas';

const APARIENCIA: Apariencia = {
  piel: '#f1c27d',
  pelo: '#1b1b1f',
  ropa: '#e74c3c',
  pantalon: '#2c3e50',
  peinado: 'corto',
  accesorio: 'ninguno',
};

function entrada(cambios: Partial<Entrada> = {}): Entrada {
  return { ...SIN_ENTRADA, ...cambios };
}

/** Combate ya en fase de lucha con los luchadores a la distancia indicada. */
function combateEnLucha(distancia = 20): Combate {
  const c = crearCombate(
    { nombre: 'Eva', apariencia: APARIENCIA },
    { nombre: 'Rival', apariencia: APARIENCIA },
  );
  for (let i = 0; i < COMBATE.ticksPresentacion; i++)
    actualizarCombate(c, [SIN_ENTRADA, SIN_ENTRADA]);
  c.luchadores[0].x = 150;
  c.luchadores[1].x = 150 + distancia;
  return c;
}

function avanzar(c: Combate, ticks: number, e0 = SIN_ENTRADA, e1 = SIN_ENTRADA): void {
  for (let i = 0; i < ticks; i++) actualizarCombate(c, [e0, e1]);
}

/** Pulsa un ataque un tick y deja pasar el resto. */
function golpear(
  c: Combate,
  ataque: 'punetazo' | 'patada' | 'especial',
  defensa = SIN_ENTRADA,
): void {
  actualizarCombate(c, [entrada({ [ataque]: true }), defensa]);
  const a = ATAQUES[ataque];
  avanzar(c, a.arranque + a.activo + a.recuperacion + 2, SIN_ENTRADA, defensa);
}

describe('inicio del combate', () => {
  it('empieza en la presentación de la ronda 1 con la vida llena', () => {
    const c = crearCombate(
      { nombre: 'Eva', apariencia: APARIENCIA },
      { nombre: 'Rival', apariencia: APARIENCIA },
    );
    expect(c.fase).toBe('presentacion');
    expect(c.ronda).toBe(1);
    expect(c.luchadores.map((l) => l.vida)).toEqual([VIDA_MAXIMA, VIDA_MAXIMA]);
    expect(segundosRestantes(c)).toBe(COMBATE.segundosPorRonda);
    expect(c.luchadores[0].mira).toBe(1);
    expect(c.luchadores[1].mira).toBe(-1);
  });

  it('no deja moverse durante la presentación', () => {
    const c = crearCombate(
      { nombre: 'Eva', apariencia: APARIENCIA },
      { nombre: 'Rival', apariencia: APARIENCIA },
    );
    const x = c.luchadores[0].x;
    avanzar(c, 10, entrada({ derecha: true }));
    expect(c.luchadores[0].x).toBe(x);
    avanzar(c, COMBATE.ticksPresentacion);
    expect(c.fase).toBe('luchando');
  });
});

describe('movimiento', () => {
  it('camina, salta y vuelve al suelo', () => {
    const c = combateEnLucha(100);
    const x = c.luchadores[0].x;
    avanzar(c, 10, entrada({ derecha: true }));
    expect(c.luchadores[0].x).toBeGreaterThan(x);
    expect(c.luchadores[0].estado).toBe('caminar');

    actualizarCombate(c, [entrada({ saltar: true }), SIN_ENTRADA]);
    avanzar(c, 5);
    expect(c.luchadores[0].y).toBeLessThan(ESCENARIO.suelo);
    avanzar(c, 60);
    expect(c.luchadores[0].y).toBe(ESCENARIO.suelo);
    expect(c.luchadores[0].estado).toBe('reposo');
  });

  it('no sale del escenario', () => {
    const c = combateEnLucha(100);
    avanzar(c, 300, entrada({ izquierda: true }));
    expect(c.luchadores[0].x).toBe(ESCENARIO.margen);
  });

  it('no atraviesa al rival y se gira para mirarle', () => {
    const c = combateEnLucha(40);
    avanzar(c, 120, entrada({ derecha: true }));
    expect(c.luchadores[1].x - c.luchadores[0].x).toBeGreaterThanOrEqual(
      FISICA.separacionMinima - 0.1,
    );
    c.luchadores[0].x = 250;
    c.luchadores[1].x = 100;
    avanzar(c, 1);
    expect(c.luchadores[0].mira).toBe(-1);
    expect(c.luchadores[1].mira).toBe(1);
  });
});

describe('golpes', () => {
  it('el puñetazo quita su daño y da energía a los dos', () => {
    const c = combateEnLucha();
    golpear(c, 'punetazo');
    const [a, b] = c.luchadores;
    expect(b.vida).toBe(VIDA_MAXIMA - ATAQUES.punetazo.danio);
    expect(a.energia).toBeGreaterThan(b.energia);
    expect(b.energia).toBeGreaterThan(0);
  });

  it('un golpe solo cuenta una vez aunque siga activo', () => {
    const c = combateEnLucha();
    golpear(c, 'patada');
    expect(c.luchadores[1].vida).toBe(VIDA_MAXIMA - ATAQUES.patada.danio);
  });

  it('el golpe no da hasta que termina el arranque', () => {
    const c = combateEnLucha();
    actualizarCombate(c, [entrada({ patada: true }), SIN_ENTRADA]);
    avanzar(c, ATAQUES.patada.arranque - 2);
    expect(golpeActivo(c.luchadores[0])).toBe(false);
    expect(c.luchadores[1].vida).toBe(VIDA_MAXIMA);
  });

  it('de lejos el golpe falla', () => {
    const c = combateEnLucha(80);
    golpear(c, 'patada');
    expect(c.luchadores[1].vida).toBe(VIDA_MAXIMA);
  });

  it('el golpeado queda aturdido y no puede responder', () => {
    const c = combateEnLucha();
    actualizarCombate(c, [entrada({ punetazo: true }), SIN_ENTRADA]);
    avanzar(c, ATAQUES.punetazo.arranque);
    expect(c.luchadores[1].estado).toBe('golpeado');
    actualizarCombate(c, [SIN_ENTRADA, entrada({ punetazo: true })]);
    expect(c.luchadores[1].estado).toBe('golpeado');
  });
});

describe('bloqueo', () => {
  it('bloquear de cara reduce mucho el daño', () => {
    const c = combateEnLucha();
    golpear(c, 'patada', entrada({ bloquear: true }));
    const vida = c.luchadores[1].vida;
    expect(vida).toBeLessThan(VIDA_MAXIMA);
    expect(VIDA_MAXIMA - vida).toBeLessThan(ATAQUES.patada.danio / 2);
  });

  it('bloquear de espaldas no sirve', () => {
    const c = combateEnLucha();
    const [atacante, defensor] = c.luchadores;
    defensor.estado = 'bloqueo';
    defensor.mira = 1; // de espaldas al atacante
    atacante.estado = 'punetazo';
    atacante.ticks = ATAQUES.punetazo.arranque;
    resolverGolpe(atacante, defensor, []);
    expect(defensor.vida).toBe(VIDA_MAXIMA - ATAQUES.punetazo.danio);
    expect(defensor.estado).toBe('golpeado');
  });
});

describe('especial', () => {
  it('no sale sin la energía llena', () => {
    const c = combateEnLucha();
    actualizarCombate(c, [entrada({ especial: true }), SIN_ENTRADA]);
    expect(c.luchadores[0].estado).not.toBe('especial');
  });

  it('con la energía llena sale, hace más daño y la gasta', () => {
    const c = combateEnLucha();
    c.luchadores[0].energia = ENERGIA_MAXIMA;
    golpear(c, 'especial');
    expect(c.luchadores[1].vida).toBe(VIDA_MAXIMA - ATAQUES.especial.danio);
    expect(c.luchadores[0].energia).toBeLessThan(ENERGIA_MAXIMA);
  });
});

describe('rondas', () => {
  it('quien se queda sin vida pierde la ronda por K.O.', () => {
    const c = combateEnLucha();
    c.luchadores[1].vida = 3;
    golpear(c, 'punetazo');
    expect(c.fase).toBe('finRonda');
    expect(c.ganadorRonda).toBe(0);
    expect(c.victorias).toEqual([1, 0]);
    expect(c.luchadores[1].estado).toBe('ko');
  });

  it('se acaba el tiempo y gana quien tiene más vida', () => {
    const c = combateEnLucha(100);
    c.luchadores[0].vida = 40;
    avanzar(c, COMBATE.segundosPorRonda * TICKS_POR_SEGUNDO);
    expect(c.fase).toBe('finRonda');
    expect(c.ganadorRonda).toBe(1);
  });

  it('si se acaba el tiempo con la misma vida, nadie suma', () => {
    const c = combateEnLucha(100);
    avanzar(c, COMBATE.segundosPorRonda * TICKS_POR_SEGUNDO);
    expect(c.ganadorRonda).toBeNull();
    expect(c.victorias).toEqual([0, 0]);
  });

  it('tras una ronda empieza otra con la vida llena', () => {
    const c = combateEnLucha();
    c.luchadores[1].vida = 3;
    golpear(c, 'punetazo');
    avanzar(c, COMBATE.ticksFinRonda);
    expect(c.ronda).toBe(2);
    expect(c.fase).toBe('presentacion');
    expect(c.luchadores[1].vida).toBe(VIDA_MAXIMA);
    expect(c.victorias).toEqual([1, 0]);
  });

  it('gana el combate quien gana dos rondas', () => {
    const c = combateEnLucha();
    for (let ronda = 0; ronda < 2; ronda++) {
      avanzar(c, COMBATE.ticksPresentacion);
      c.luchadores[0].x = 150;
      c.luchadores[1].x = 170;
      c.luchadores[1].vida = 3;
      golpear(c, 'punetazo');
      avanzar(c, COMBATE.ticksFinRonda);
    }
    expect(c.fase).toBe('finCombate');
    expect(c.ganador).toBe(0);
    expect(c.victorias).toEqual([2, 0]);
  });
});

describe('caída', () => {
  it('el caído se aparta de la pared sin pasar al otro por encima', () => {
    const c = combateEnLucha();
    const [a, b] = c.luchadores;
    a.x = ESCENARIO.ancho - ESCENARIO.margen - 20;
    b.x = ESCENARIO.ancho - ESCENARIO.margen;
    b.vida = 3;
    golpear(c, 'punetazo');
    expect(b.estado).toBe('ko');
    expect(b.x).toBeLessThan(ESCENARIO.ancho - ESCENARIO.margen - 30);
    expect(a.x).toBeLessThan(b.x);
  });
});
