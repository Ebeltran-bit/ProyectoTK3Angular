/**
 * Números que definen cómo se juega. Todo se mide en píxeles del escenario
 * (320 x 180) y en "ticks": la lógica avanza 60 veces por segundo.
 * Cambiar estos valores cambia la sensación del juego sin tocar el código.
 */
export const TICKS_POR_SEGUNDO = 60;

export const ESCENARIO = { ancho: 320, alto: 180, suelo: 164, margen: 16 };

export const FISICA = {
  velocidadCaminar: 1.6,
  impulsoSalto: -5.4,
  avanceSalto: 1.8,
  gravedad: 0.3,
  separacionMinima: 22,
};

export const VIDA_MAXIMA = 100;
export const ENERGIA_MAXIMA = 100;
/** Energía que gana quien golpea y quien recibe. */
export const ENERGIA_POR_GOLPE = { dado: 12, recibido: 6 };
/** Parte del daño que pasa aunque se bloquee. */
export const DANIO_BLOQUEADO = 0.15;

export type TipoAtaque = 'punetazo' | 'patada' | 'especial';

export interface Ataque {
  /** Ticks antes de que el golpe pueda dar. */
  arranque: number;
  /** Ticks durante los que el golpe puede dar. */
  activo: number;
  /** Ticks después, en los que no puedes hacer nada (castigo por fallar). */
  recuperacion: number;
  danio: number;
  /** Zona del golpe respecto al luchador: x hacia delante, y hacia arriba desde los pies. */
  alcance: { desde: number; hasta: number; arriba: number; abajo: number };
  aturdimiento: number;
  empuje: number;
}

export const ATAQUES: Record<TipoAtaque, Ataque> = {
  punetazo: {
    arranque: 4,
    activo: 4,
    recuperacion: 9,
    danio: 6,
    alcance: { desde: 6, hasta: 22, arriba: 38, abajo: 26 },
    aturdimiento: 14,
    empuje: 2.2,
  },
  patada: {
    arranque: 8,
    activo: 5,
    recuperacion: 14,
    danio: 10,
    alcance: { desde: 6, hasta: 28, arriba: 32, abajo: 18 },
    aturdimiento: 18,
    empuje: 3.2,
  },
  especial: {
    arranque: 12,
    activo: 8,
    recuperacion: 20,
    danio: 20,
    alcance: { desde: 4, hasta: 36, arriba: 42, abajo: 14 },
    aturdimiento: 34,
    empuje: 6,
  },
};

/** Zona del cuerpo que puede recibir golpes, respecto a los pies. */
export const CUERPO = { mitadAncho: 8, alto: 44 };

export const COMBATE = {
  segundosPorRonda: 60,
  rondasParaGanar: 2,
  ticksPresentacion: 100,
  ticksFinRonda: 160,
};
