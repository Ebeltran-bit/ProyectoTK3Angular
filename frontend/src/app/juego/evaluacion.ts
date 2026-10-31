/**
 * Lógica del duelo de ritmo: juzgar pulsaciones y llevar el marcador.
 *
 * Son funciones puras: reciben datos y devuelven datos nuevos, sin tocar el
 * audio, la pantalla ni Angular. Por eso se pueden probar con Vitest.
 * Todos los tiempos van en milisegundos desde el inicio de la canción.
 */
import {
  HYPE,
  HYPE_INICIAL,
  HYPE_MAXIMO,
  PUNTOS,
  VENTANA_GREAT_MS,
  VENTANA_PERFECT_MS,
} from './reglas';

export type Juicio = 'perfect' | 'great' | 'miss';
export type Tecla = 'accion' | 'alterna';

export interface NotaEnJuego {
  ms: number;
  tecla: Tecla;
  /** null mientras no se ha juzgado. Cada nota se juzga una sola vez. */
  juicio: Juicio | null;
}

export interface Marcador {
  puntos: number;
  combo: number;
  comboMaximo: number;
  hype: number;
  perfect: number;
  great: number;
  miss: number;
}

export interface Partida {
  notas: NotaEnJuego[];
  marcador: Marcador;
}

/** Convierte un pulso de la canción en milisegundos: cada pulso dura 60000 / BPM ms. */
export function pulsoAMs(pulso: number, bpm: number): number {
  return (pulso * 60000) / bpm;
}

export function marcadorInicial(): Marcador {
  return { puntos: 0, combo: 0, comboMaximo: 0, hype: HYPE_INICIAL, perfect: 0, great: 0, miss: 0 };
}

export function crearPartida(notas: { ms: number; tecla: Tecla }[]): Partida {
  return { notas: notas.map((n) => ({ ...n, juicio: null })), marcador: marcadorInicial() };
}

/** Juicio según lo lejos que quede la pulsación de la nota, antes o después. */
export function juzgarDesfase(desfaseMs: number): Juicio {
  const distancia = Math.abs(desfaseMs);
  if (distancia <= VENTANA_PERFECT_MS) return 'perfect';
  if (distancia <= VENTANA_GREAT_MS) return 'great';
  return 'miss';
}

/** Suma un juicio al marcador: puntos, combo (se rompe con MISS) y Hype entre 0 y 100. */
export function aplicarJuicio(m: Marcador, juicio: Juicio): Marcador {
  const combo = juicio === 'miss' ? 0 : m.combo + 1;
  return {
    puntos: m.puntos + PUNTOS[juicio],
    combo,
    comboMaximo: Math.max(m.comboMaximo, combo),
    hype: Math.min(HYPE_MAXIMO, Math.max(0, m.hype + HYPE[juicio])),
    perfect: m.perfect + (juicio === 'perfect' ? 1 : 0),
    great: m.great + (juicio === 'great' ? 1 : 0),
    miss: m.miss + (juicio === 'miss' ? 1 : 0),
  };
}

/**
 * El jugador pulsa una tecla en el instante `ms`.
 * - Se busca la nota sin juzgar más cercana dentro de la ventana GREAT.
 * - Si no hay ninguna, la pulsación es un fallo (MISS) y no gasta ninguna nota.
 * - Si la tecla no es la de la nota, esa nota queda como MISS.
 */
export function pulsar(p: Partida, ms: number, tecla: Tecla): { partida: Partida; juicio: Juicio } {
  let indice = -1;
  for (let i = 0; i < p.notas.length; i++) {
    const n = p.notas[i];
    if (n.juicio !== null || Math.abs(n.ms - ms) > VENTANA_GREAT_MS) continue;
    if (indice === -1 || Math.abs(n.ms - ms) < Math.abs(p.notas[indice].ms - ms)) indice = i;
  }
  if (indice === -1) {
    return { partida: { ...p, marcador: aplicarJuicio(p.marcador, 'miss') }, juicio: 'miss' };
  }
  const nota = p.notas[indice];
  const juicio = nota.tecla === tecla ? juzgarDesfase(ms - nota.ms) : 'miss';
  const notas = p.notas.map((n, i) => (i === indice ? { ...n, juicio } : n));
  return { partida: { notas, marcador: aplicarJuicio(p.marcador, juicio) }, juicio };
}

/** Marca como MISS las notas que ya pasaron su ventana sin que nadie las pulsara. */
export function cerrarNotasPasadas(p: Partida, ms: number): { partida: Partida; fallos: number } {
  let marcador = p.marcador;
  let fallos = 0;
  const notas = p.notas.map((n) => {
    if (n.juicio !== null || ms - n.ms <= VENTANA_GREAT_MS) return n;
    fallos++;
    marcador = aplicarJuicio(marcador, 'miss');
    return { ...n, juicio: 'miss' as const };
  });
  return fallos === 0 ? { partida: p, fallos } : { partida: { notas, marcador }, fallos };
}
