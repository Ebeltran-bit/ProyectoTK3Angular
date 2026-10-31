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
