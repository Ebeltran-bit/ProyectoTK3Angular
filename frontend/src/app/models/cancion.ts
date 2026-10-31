/** Forma de las canciones (beatmaps) que manda el backend. Los tiempos van en pulsos. */
export type Nivel = 'facil' | 'media' | 'dificil';

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  facil: 'Fácil',
  media: 'Media',
  dificil: 'Difícil',
};

export interface CancionResumen {
  id: string;
  titulo: string;
  nivel: Nivel;
  bpm: number;
  escenario: string;
  num_notas: number;
}

export interface NotaCancion {
  pulso: number;
  /** accion = J, alterna = K */
  tecla: 'accion' | 'alterna';
}

export interface Pista {
  instrumento: 'bajo' | 'melodia' | 'bombo' | 'charles' | 'caja';
  volumen: number;
  /** Cada nota es [altura MIDI, pulso, duración en pulsos], contando desde el inicio del patrón. */
  notas: [number, number, number][];
}

export interface Cancion extends Omit<CancionResumen, 'num_notas'> {
  pulsos_por_compas: number;
  /** Pulsos de cuenta atrás antes de la primera nota. */
  cuenta_atras: number;
  /** Pulso en el que termina la canción. */
  fin: number;
  audio: string | null;
  /** Cuántos pulsos antes de cada nota suena el aviso (el graznido de la gaviota). */
  aviso_antes: number;
  notas: NotaCancion[];
  musica: { repetir_cada: number; pistas: Pista[] };
}

/** Una tecla pulsada, en milisegundos desde el inicio de la canción. */
export interface Pulsacion {
  ms: number;
  tecla: 'accion' | 'alterna';
}

/** Puntuación de una partida calculada por el backend. */
export interface Resultado {
  puntos: number;
  combo: number;
  combo_maximo: number;
  hype: number;
  perfect: number;
  great: number;
  miss: number;
}
