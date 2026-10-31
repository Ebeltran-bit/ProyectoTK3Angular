import { Juicio } from '../evaluacion';

/** Lo que un escenario necesita saber para dibujar un instante de la partida. */
export interface VistaEscena {
  /** Segundos desde el inicio de la canción (negativo antes de empezar). */
  segundos: number;
  /** Pulso actual de la canción, con decimales. */
  pulso: number;
  /** Notas de la canción con su juicio (null si aún no se ha juzgado). */
  notas: { pulso: number; juicio: Juicio | null }[];
  /** Segundos desde la última pulsación del jugador (Infinity si no ha pulsado). */
  desdePulsacion: number;
}

export type DibujarEscena = (c: CanvasRenderingContext2D, vista: VistaEscena) => void;
