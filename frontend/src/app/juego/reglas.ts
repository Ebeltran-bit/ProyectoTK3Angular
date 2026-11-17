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

/**
 * Estrellas de la tarjeta final según el Hype con que acaba la canción. Son los mismos cortes
 * que usa el mensaje final de cada escena. Solo se enseñan: no cambian la puntuación.
 */
export const ESTRELLAS = { tres: 70, dos: 40 } as const;

/**
 * Premios de combo (etapa 4): un cartel y un sonido al llegar a estos aciertos seguidos.
 * Solo se enseñan: no suman puntos ni Hype. En las canciones con menos notas que el oro,
 * el oro es tocarlas todas seguidas (decisión de Eva del 16/11/2026).
 */
export const PREMIOS_COMBO = { bronce: 10, plata: 25, oro: 50 } as const;

/**
 * «Tu ritmo» de la tarjeta final: se dice «¡Clavas el ritmo!» si la media de los aciertos
 * queda a menos de estos milisegundos y al menos esta parte de ellos son PERFECT.
 */
export const RITMO_CLAVADO_MS = 10;
export const RITMO_CLAVADO_PERFECT = 0.8;

/**
 * Que se oiga cuándo pulsar (aprobado por Eva el 17/11/2026, «una mezcla» entre los arreglos
 * de la etapa 4 y una versión más simple). Las pistas de acompañamiento que rellenan
 * corcheas suenan más flojas en los contratiempos donde no hay nota: así un golpe fuerte a
 * contratiempo casi siempre significa «aquí hay que pulsar». La melodía no se toca.
 */
export const INSTRUMENTOS_DE_RELLENO = [
  'maraca',
  'charles',
  'bajo_redondo',
  'caja',
  'pulsado',
  'campana',
] as const;
/** Volumen de esas notas de relleno (1 = como estaban; 0 = calladas). */
export const RELLENO_SIN_NOTA = 0.3;
/** Cuánto suben los avisos de las notas sobre el resto de efectos (2 = +6 dB). */
export const SUBIDA_AVISOS = 2;
/** Cuánto sube la música respecto a la etapa 4 (petición de Eva del 17/11/2026: «un pelín»). */
export const SUBIDA_MUSICA = 1.2;
