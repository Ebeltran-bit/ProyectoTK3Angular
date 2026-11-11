/**
 * Escenas que ya tienen versión 3D, por su id (el campo `escenario` del beatmap).
 * Este archivo trae three.js, que pesa bastante: el reproductor lo carga aparte y solo
 * cuando hace falta (ver `cargarEscena3d` en el reproductor).
 */
import { bar3d } from './bar';
import { puerto3d } from './puerto';
import { Definicion3d } from './tipos';

export { Motor } from './motor';
export type { Calidad } from './motor';
export type { Definicion3d, Escena3d } from './tipos';

export const ESCENAS_3D: Record<string, Definicion3d> = {
  puerto: puerto3d,
  bar: bar3d,
};
