/** Participante tal como lo devuelve la API. */
export interface Participante {
  id: number;
  nick: string;
  logo: string | null;
  activo: boolean;
  creado_en: string;
}

/** Datos que se envían para crear o editar un participante. */
export interface ParticipanteEntrada {
  nick: string;
  logo: string | null;
}
