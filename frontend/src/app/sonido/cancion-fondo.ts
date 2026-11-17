/**
 * Canción de fondo de las pantallas de gestión (aprobada por Eva el 17/11/2026).
 * Ocho compases tranquilos en fa mayor que se repiten sin corte. Original y hecha por código,
 * como las del juego: aquí solo están las notas; las toca interfaz.ts.
 */

/** Pulsos por minuto: más lenta que las canciones del juego, para que no distraiga. */
export const BPM_FONDO = 96;
/** Largo de la vuelta, en pulsos (8 compases de 4). */
export const PULSOS_FONDO = 32;

/** Acorde de cada compás: el bajo primero y luego las tres notas de arriba (alturas MIDI). */
export const ACORDES_FONDO: readonly (readonly number[])[] = [
  [53, 57, 60, 64],
  [50, 57, 60, 65],
  [46, 58, 62, 65],
  [48, 55, 60, 64],
  [53, 57, 60, 64],
  [50, 57, 62, 65],
  [46, 58, 62, 67],
  [48, 58, 64, 67],
];

/** Melodía: [altura MIDI, pulso dentro de la vuelta]. */
export const MELODIA_FONDO: readonly (readonly [number, number])[] = [
  [72, 0],
  [76, 1.5],
  [77, 2],
  [76, 3],
  [74, 4],
  [72, 5.5],
  [69, 6],
  [72, 8],
  [70, 9.5],
  [69, 10],
  [67, 11],
  [65, 12],
  [67, 13.5],
  [69, 14],
  [72, 16],
  [76, 17.5],
  [77, 18],
  [79, 19],
  [77, 20],
  [76, 21.5],
  [74, 22],
  [72, 24],
  [74, 25.5],
  [76, 26],
  [74, 27],
  [72, 28],
];

/** Instante (en segundos desde el inicio de la vuelta) de cada pulso. */
export function segundoDelPulso(pulso: number): number {
  return (pulso * 60) / BPM_FONDO;
}

/** Duración de una vuelta entera, en segundos. */
export const SEGUNDOS_POR_VUELTA = segundoDelPulso(PULSOS_FONDO);
