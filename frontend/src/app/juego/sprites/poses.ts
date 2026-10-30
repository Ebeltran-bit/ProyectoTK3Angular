/**
 * Poses del personaje, como un esqueleto de puntos en píxeles.
 *
 * El sprite mide ANCHO x ALTO píxeles, mira a la derecha y tiene los pies
 * en el suelo (y = ALTO - 1). Cada pose dice dónde están la cabeza, el
 * torso y las articulaciones; el dibujante pinta encima los colores.
 */
export const ANCHO = 48;
export const ALTO = 56;

export interface Punto {
  x: number;
  y: number;
}

export interface Extremidad {
  inicio: Punto; // hombro o cadera
  medio: Punto; // codo o rodilla
  fin: Punto; // mano o pie
}

export interface Pose {
  cabeza: Punto; // esquina superior izquierda de la cabeza (10 x 10)
  cuello: Punto; // centro superior del torso
  cadera: Punto; // centro inferior del torso
  brazoDelante: Extremidad;
  brazoAtras: Extremidad;
  piernaDelante: Extremidad;
  piernaAtras: Extremidad;
}

const p = (x: number, y: number): Punto => ({ x, y });

/** Desplaza en vertical todo lo que está por encima de la cadera (para respirar). */
function subirTronco(pose: Pose, dy: number): Pose {
  const mover = (q: Punto) => p(q.x, q.y + dy);
  const brazo = (b: Extremidad) => ({
    inicio: mover(b.inicio),
    medio: mover(b.medio),
    fin: mover(b.fin),
  });
  return {
    ...pose,
    cabeza: mover(pose.cabeza),
    cuello: mover(pose.cuello),
    brazoDelante: brazo(pose.brazoDelante),
    brazoAtras: brazo(pose.brazoAtras),
  };
}

/** Guardia: puños arriba y piernas abiertas. */
const GUARDIA: Pose = {
  cabeza: p(20, 11),
  cuello: p(24, 22),
  cadera: p(24, 36),
  brazoDelante: { inicio: p(27, 24), medio: p(31, 31), fin: p(33, 24) },
  brazoAtras: { inicio: p(21, 24), medio: p(23, 32), fin: p(28, 27) },
  piernaDelante: { inicio: p(26, 37), medio: p(29, 45), fin: p(30, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(19, 45), fin: p(17, 53) },
};

const PUNETAZO: Pose = {
  ...GUARDIA,
  cabeza: p(21, 11),
  brazoDelante: { inicio: p(27, 24), medio: p(34, 24), fin: p(41, 23) },
  brazoAtras: { inicio: p(21, 24), medio: p(21, 31), fin: p(26, 29) },
};

const PATADA: Pose = {
  ...GUARDIA,
  cabeza: p(18, 12),
  cuello: p(23, 23),
  brazoDelante: { inicio: p(26, 25), medio: p(29, 31), fin: p(31, 25) },
  brazoAtras: { inicio: p(20, 25), medio: p(17, 31), fin: p(14, 28) },
  piernaDelante: { inicio: p(26, 37), medio: p(34, 33), fin: p(43, 30) },
  piernaAtras: { inicio: p(22, 37), medio: p(22, 45), fin: p(21, 53) },
};

/** Animaciones: cada una es una lista de fotogramas. */
export const ANIMACIONES = {
  reposo: [GUARDIA, GUARDIA, subirTronco(GUARDIA, 1), subirTronco(GUARDIA, 1)],
  punetazo: [PUNETAZO],
  patada: [PATADA],
} satisfies Record<string, Pose[]>;

export type NombreAnimacion = keyof typeof ANIMACIONES;
