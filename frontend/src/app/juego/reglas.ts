/**
 * Números del duelo de ritmo, todos juntos para poder ajustarlos en un solo sitio.
 * Los usa evaluacion.ts; el backend tendrá los mismos valores cuando valide los duelos (etapa 6).
 */

/** Ventanas de tiempo, en milisegundos, a cada lado de la nota. */
export const VENTANA_PERFECT_MS = 40;
export const VENTANA_GREAT_MS = 90;

/** Puntos por acierto. Un MISS no suma. */
export const PUNTOS = { perfect: 300, great: 100, miss: 0 } as const;

/** Cuánto sube o baja la barra de Hype del público con cada juicio. */
export const HYPE = { perfect: 3, great: 1, miss: -6 } as const;
export const HYPE_INICIAL = 50;
export const HYPE_MAXIMO = 100;

/** Teclas del juego: J para la acción principal y K para la alternativa. */
export const TECLAS: Record<string, 'accion' | 'alterna'> = { KeyJ: 'accion', KeyK: 'alterna' };
