/**
 * Volumen del juego (etapa 4, propuesta A): una barra para la música, otra para los
 * efectos y un interruptor para silenciarlo todo.
 *
 * Se guarda en el navegador (localStorage), no en la base de datos: es una preferencia de
 * cada ordenador. Va en una señal compartida para que el panel de sonido y el reproductor
 * vean siempre el mismo valor.
 */
import { signal } from '@angular/core';

export interface Volumen {
  /** De 0 a 1: la canción, el acorde final y la melodía de estrellas. */
  musica: number;
  /** De 0 a 1: la cuenta, los avisos, los aciertos, los fallos, los premios y la pausa. */
  efectos: number;
  silencio: boolean;
}

const CLAVE = 'tk3_volumen';
export const VOLUMEN_INICIAL: Volumen = { musica: 1, efectos: 1, silencio: false };

/** Deja un valor guardado en un volumen válido: lo que falte o esté mal vuelve al inicial. */
export function sanearVolumen(valor: unknown): Volumen {
  const v = (typeof valor === 'object' && valor !== null ? valor : {}) as Record<string, unknown>;
  const nivel = (x: unknown, porDefecto: number) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : porDefecto;
  return {
    musica: nivel(v['musica'], VOLUMEN_INICIAL.musica),
    efectos: nivel(v['efectos'], VOLUMEN_INICIAL.efectos),
    silencio: v['silencio'] === true,
  };
}

function leer(): Volumen {
  try {
    return sanearVolumen(JSON.parse(localStorage.getItem(CLAVE) ?? 'null'));
  } catch {
    return VOLUMEN_INICIAL;
  }
}

/** Volumen actual. Para cambiarlo, cambiarVolumen (así también se guarda). */
export const volumen = signal<Volumen>(leer());

export function cambiarVolumen(cambio: Partial<Volumen>): void {
  volumen.update((v) => sanearVolumen({ ...v, ...cambio }));
  try {
    localStorage.setItem(CLAVE, JSON.stringify(volumen()));
  } catch {
    // Sin almacenamiento (modo privado estricto): vale para esta visita
  }
}
