import { Participante } from './participante';

export type EstadoTorneo = 'preparacion' | 'cuadro_generado' | 'finalizado';

/** Texto que se muestra para cada estado. */
export const NOMBRE_ESTADO: Record<EstadoTorneo, string> = {
  preparacion: 'En preparación',
  cuadro_generado: 'Cuadro generado',
  finalizado: 'Finalizado',
};

/** Lo mínimo de un participante para pintarlo en el cuadro. */
export interface ParticipanteResumen {
  id: number;
  nick: string;
  logo: string | null;
}

export interface Combate {
  id: number;
  ronda: number;
  posicion: number;
  participante1: ParticipanteResumen;
  /** null cuando es un BYE */
  participante2: ParticipanteResumen | null;
  id_ganador: number | null;
  es_bye: boolean;
  estado: 'pendiente' | 'resuelto';
}

/** Torneo tal como aparece en el listado. */
export interface TorneoResumen {
  id: number;
  nombre: string;
  estado: EstadoTorneo;
  num_participantes: number;
  campeon: ParticipanteResumen | null;
  creado_en: string;
}

/** Torneo completo, con inscritos y combates. */
export interface TorneoDetalle extends TorneoResumen {
  participantes: Participante[];
  total_rondas: number;
  combates: Combate[];
}

/** Datos que se envían para crear o editar un torneo. */
export interface TorneoEntrada {
  nombre: string;
  participantes: number[];
}
