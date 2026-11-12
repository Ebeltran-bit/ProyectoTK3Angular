/** Una fila del informe de victorias y derrotas. La calcula el backend (fase 4). */
export interface EstadisticaParticipante {
  id: number;
  nick: string;
  logo: string | null;
  /** Icono del usuario vinculado (null = el animal que le toca por su id, ver iconoDe). */
  icono: string | null;
  activo: boolean;
  /** Combates jugados; los BYE no cuentan. */
  combates: number;
  victorias: number;
  derrotas: number;
  torneos_ganados: number;
}

/** Mejor partida de un usuario en una canción. */
export interface Marca {
  puesto: number;
  id_usuario: number;
  /** Participante vinculado al usuario, si tiene: así su animal es el mismo que en el torneo. */
  id_participante: number | null;
  icono: string | null;
  nombre_usuario: string;
  puntos: number;
  perfect: number;
  great: number;
  miss: number;
  combo_maximo: number;
  jugada_en: string;
}

/** Récords de una canción: el top 3 (o el top 10 en su pantalla), con una marca por usuario. */
export interface RecordsCancion {
  id: string;
  titulo: string;
  nivel: 'facil' | 'media' | 'dificil';
  marcas: Marca[];
}
