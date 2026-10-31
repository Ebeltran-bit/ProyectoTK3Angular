/** Una fila del informe de victorias y derrotas. La calcula el backend (fase 4). */
export interface EstadisticaParticipante {
  id: number;
  nick: string;
  logo: string | null;
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
  nombre_usuario: string;
  puntos: number;
  perfect: number;
  great: number;
  miss: number;
  combo_maximo: number;
  jugada_en: string;
}

/** Récords de una canción: el top 5, con una marca por usuario. */
export interface RecordsCancion {
  id: string;
  titulo: string;
  nivel: 'facil' | 'media' | 'dificil';
  marcas: Marca[];
}
