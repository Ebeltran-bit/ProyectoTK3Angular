/**
 * Preguntas que las escenas 3D hacen sobre la partida para decidir sus reacciones.
 * Son funciones puras sobre la `VistaEscena`, probadas con Vitest.
 */
import { Juicio } from '../evaluacion';
import { VENTANA_GREAT_MS } from '../reglas';
import { VistaEscena } from '../escenarios/tipos';

export interface NotaJuzgada {
  indice: number;
  juicio: Juicio;
  /** Pulsos que han pasado desde la nota. */
  hace: number;
}

/** La última nota ya juzgada, si fue hace menos de `duracion` pulsos. */
export function ultimaJuzgada(v: VistaEscena, duracion: number): NotaJuzgada | null {
  for (let i = v.notas.length - 1; i >= 0; i--) {
    const n = v.notas[i];
    if (n.juicio === null) continue;
    const hace = v.pulso - n.pulso;
    // Una nota se puede acertar un pelín antes de su pulso: por eso se admite algo negativo
    if (hace < -0.3 || hace > duracion) continue;
    return { indice: i, juicio: n.juicio, hace: Math.max(0, hace) };
  }
  return null;
}

/**
 * Índice de la nota que acertó la última pulsación, o null si esa pulsación fue un fallo
 * (o si todavía no se ha pulsado). Se sabe porque la nota acertada queda a menos de la
 * ventana GREAT del instante en que se pulsó.
 */
export function notaAcertada(v: VistaEscena): number | null {
  if (!Number.isFinite(v.desdePulsacion)) return null;
  const pulsoDeLaPulsacion = v.pulso - (v.desdePulsacion * v.bpm) / 60;
  const margen = ((VENTANA_GREAT_MS + 1) / 60000) * v.bpm;
  for (let i = v.notas.length - 1; i >= 0; i--) {
    const n = v.notas[i];
    if (n.juicio !== 'perfect' && n.juicio !== 'great') continue;
    if (Math.abs(n.pulso - pulsoDeLaPulsacion) <= margen) return i;
  }
  return null;
}

/** Golpe del compás: vale 1 justo en cada pulso y cae a 0 antes del siguiente. */
export function latido(pulso: number): number {
  const fraccion = pulso - Math.floor(pulso);
  return (1 - fraccion) ** 3;
}
