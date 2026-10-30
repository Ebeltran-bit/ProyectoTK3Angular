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

/** Preparación de los golpes: se echa el puño o la pierna atrás. */
const CARGA_PUNETAZO: Pose = {
  ...GUARDIA,
  cabeza: p(19, 11),
  brazoDelante: { inicio: p(26, 24), medio: p(27, 30), fin: p(29, 26) },
};

const CARGA_PATADA: Pose = {
  ...GUARDIA,
  cabeza: p(19, 11),
  piernaDelante: { inicio: p(26, 37), medio: p(31, 41), fin: p(28, 48) },
  piernaAtras: { inicio: p(22, 37), medio: p(21, 45), fin: p(20, 53) },
};

/** Pasos al caminar: las piernas se cruzan y el tronco sube y baja. */
const PASO_A: Pose = {
  ...GUARDIA,
  piernaDelante: { inicio: p(26, 37), medio: p(30, 45), fin: p(33, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(19, 45), fin: p(15, 53) },
};
const PASO_B: Pose = subirTronco(
  {
    ...GUARDIA,
    piernaDelante: { inicio: p(26, 37), medio: p(27, 45), fin: p(26, 53) },
    piernaAtras: { inicio: p(22, 37), medio: p(23, 45), fin: p(22, 53) },
  },
  -1,
);
const PASO_C: Pose = {
  ...GUARDIA,
  piernaDelante: { inicio: p(26, 37), medio: p(24, 45), fin: p(20, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(25, 45), fin: p(28, 53) },
};

/** En el aire: rodillas recogidas. */
const SALTO: Pose = {
  ...GUARDIA,
  piernaDelante: { inicio: p(26, 37), medio: p(32, 41), fin: p(30, 48) },
  piernaAtras: { inicio: p(22, 37), medio: p(25, 44), fin: p(19, 47) },
};

/** Bloqueo: antebrazos delante de la cara y piernas más flexionadas. */
const BLOQUEO: Pose = subirTronco(
  {
    ...GUARDIA,
    cabeza: p(19, 12),
    brazoDelante: { inicio: p(27, 24), medio: p(32, 27), fin: p(32, 17) },
    brazoAtras: { inicio: p(21, 24), medio: p(27, 28), fin: p(29, 18) },
    piernaDelante: { inicio: p(26, 37), medio: p(31, 45), fin: p(31, 53) },
    piernaAtras: { inicio: p(22, 37), medio: p(18, 45), fin: p(15, 53) },
  },
  1,
);

/** Golpeado: la cabeza se va atrás y los brazos se abren. */
const GOLPEADO: Pose = {
  cabeza: p(15, 12),
  cuello: p(21, 23),
  cadera: p(24, 36),
  brazoDelante: { inicio: p(24, 25), medio: p(28, 31), fin: p(32, 34) },
  brazoAtras: { inicio: p(19, 25), medio: p(14, 28), fin: p(10, 24) },
  piernaDelante: { inicio: p(26, 37), medio: p(29, 45), fin: p(31, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(19, 45), fin: p(16, 53) },
};

/** Victoria: puño al cielo. */
const VICTORIA: Pose = {
  ...GUARDIA,
  cabeza: p(20, 10),
  cuello: p(24, 21),
  brazoDelante: { inicio: p(27, 23), medio: p(29, 15), fin: p(30, 7) },
  brazoAtras: { inicio: p(21, 23), medio: p(17, 29), fin: p(21, 33) },
  piernaDelante: { inicio: p(26, 37), medio: p(27, 45), fin: p(28, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(21, 45), fin: p(19, 53) },
};

/** Especial: carga con las manos atrás y empuja con las dos palmas. */
const CARGA_ESPECIAL: Pose = {
  ...GUARDIA,
  cabeza: p(18, 12),
  cuello: p(22, 23),
  brazoDelante: { inicio: p(25, 25), medio: p(21, 31), fin: p(16, 30) },
  brazoAtras: { inicio: p(19, 25), medio: p(15, 31), fin: p(12, 28) },
  piernaDelante: { inicio: p(26, 37), medio: p(31, 44), fin: p(34, 53) },
  piernaAtras: { inicio: p(22, 37), medio: p(17, 45), fin: p(13, 53) },
};

const ESPECIAL: Pose = {
  ...CARGA_ESPECIAL,
  cabeza: p(22, 12),
  cuello: p(25, 23),
  brazoDelante: { inicio: p(28, 25), medio: p(35, 25), fin: p(42, 24) },
  brazoAtras: { inicio: p(22, 25), medio: p(31, 27), fin: p(40, 28) },
};

/** Animaciones: cada una es una lista de fotogramas. */
export const ANIMACIONES = {
  reposo: [GUARDIA, GUARDIA, subirTronco(GUARDIA, 1), subirTronco(GUARDIA, 1)],
  punetazo: [PUNETAZO],
  patada: [PATADA],
  caminar: [PASO_A, PASO_B, PASO_C, PASO_B],
  salto: [SALTO],
  bloqueo: [BLOQUEO],
  golpeado: [GOLPEADO],
  victoria: [VICTORIA, subirTronco(VICTORIA, -1)],
  especial: [ESPECIAL],
} satisfies Record<string, Pose[]>;

export type NombreAnimacion = keyof typeof ANIMACIONES;

/** Fotograma de preparación de cada golpe (antes de que pueda dar). */
export const CARGAS = { punetazo: CARGA_PUNETAZO, patada: CARGA_PATADA, especial: CARGA_ESPECIAL };
