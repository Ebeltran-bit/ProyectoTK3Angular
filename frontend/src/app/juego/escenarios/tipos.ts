import { Juicio } from '../evaluacion';
import { SonidoAviso } from '../musica';

/** Lo que un escenario necesita saber para dibujar un instante de la partida. */
export interface VistaEscena {
  /** Segundos desde el inicio de la canción (negativo antes de empezar). */
  segundos: number;
  /** Pulso actual de la canción, con decimales. */
  pulso: number;
  /** Notas de la canción con su juicio (null si aún no se ha juzgado). */
  notas: { pulso: number; juicio: Juicio | null }[];
  /** Tecla de cada nota, en el mismo orden que `notas`. */
  teclas: ('accion' | 'alterna')[];
  /** Segundos desde la última pulsación del jugador (Infinity si no ha pulsado). */
  desdePulsacion: number;
}

export type DibujarEscena = (c: CanvasRenderingContext2D, vista: VistaEscena) => void;

/** Todo lo que define un escenario aparte de su canción. */
export interface Escenario {
  dibujar: DibujarEscena;
  /** Texto que se enseña antes de jugar: qué hay que hacer. */
  instrucciones: string;
  /** Sonido que avisa de cada nota antes de que llegue. */
  aviso: SonidoAviso;
  /** Frase del final según el Hype del público (0 a 100). */
  mensajeFinal: (hype: number) => string;
}
