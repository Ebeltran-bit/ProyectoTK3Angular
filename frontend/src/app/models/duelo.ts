import { CancionResumen } from './cancion';
import { ParticipanteResumen } from './torneo';

/** Puntuación de un participante en un duelo (calculada por el backend). */
export interface ResultadoDuelo {
  puntos: number;
  perfect: number;
  great: number;
  miss: number;
  combo_maximo: number;
}

export interface JugadorDuelo {
  participante: ParticipanteResumen;
  ha_jugado: boolean;
  es_ia: boolean;
  /** null mientras no se pueda enseñar: la del rival se ve cuando el combate termina. */
  resultado: ResultadoDuelo | null;
}

/** Duelo de ritmo de un combate del torneo. */
export interface Duelo {
  id_torneo: number;
  id_combate: number;
  ronda: number;
  total_rondas: number;
  cancion: CancionResumen;
  estado: 'pendiente' | 'resuelto';
  id_ganador: number | null;
  jugadores: JugadorDuelo[];
  /** true si el usuario de la sesión está en este combate y todavía no ha jugado. */
  puedo_jugar: boolean;
  /** Aviso del backend, por ejemplo cuando un empate total repite el duelo. */
  mensaje: string | null;
}
