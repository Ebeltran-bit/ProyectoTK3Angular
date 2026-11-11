import { VistaEscena } from '../escenarios/tipos';
import { Motor, OpcionesMotor } from './motor';

/** Una escena 3D ya construida, que se recoloca en cada fotograma. */
export interface Escena3d {
  /**
   * Coloca personajes y objetos para el instante de la partida que describe `vista`.
   * @param reloj segundos de reloj real, para lo que se mueve siempre (olas, respiración)
   * @param dt segundos desde el fotograma anterior
   */
  actualizar(vista: VistaEscena, reloj: number, dt: number): void;
  /** Dónde sale la palabra del golpe (en % del lienzo) y qué palabras van rotando al acertar. */
  readonly palabra: { x: number; y: number; aciertos: string[] };
}

/** Lo que define una escena 3D: cómo se ilumina y cómo se construye. */
export interface Definicion3d {
  motor: OpcionesMotor;
  crear: (motor: Motor) => Escena3d;
}
