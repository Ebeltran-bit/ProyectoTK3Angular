/** Participante tal como lo devuelve la API. */
export interface Participante {
  id: number;
  nick: string;
  logo: string | null;
  activo: boolean;
  creado_en: string;
  /** Icono del usuario vinculado (null = se ve la inicial). */
  icono: string | null;
  /** false = no tiene cuenta (un «bot»): en los duelos juega la IA por él. */
  tiene_usuario: boolean;
}

/** Datos que se envían para crear o editar un participante. */
export interface ParticipanteEntrada {
  nick: string;
  logo: string | null;
}
