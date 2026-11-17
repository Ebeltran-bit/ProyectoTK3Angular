/**
 * «Modo principiante» (aprobado por Eva el 17/11/2026): una regla debajo del escenario con
 * las notas de los dos compases siguientes. Se enciende con un interruptor en la tarjeta de
 * inicio y se guarda en el navegador, como el volumen. Solo se ve: no cambia la puntuación.
 */
import { signal } from '@angular/core';

const CLAVE = 'tk3_principiante';

/** Compases que se ven en la regla. */
export const COMPASES_EN_LA_REGLA = 2;

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === 'si';
  } catch {
    return false;
  }
}

export const modoPrincipiante = signal(leer());

export function cambiarModoPrincipiante(encendido: boolean): void {
  modoPrincipiante.set(encendido);
  try {
    localStorage.setItem(CLAVE, encendido ? 'si' : 'no');
  } catch {
    // Sin almacenamiento: vale para esta visita
  }
}

/** Una marca de la regla: dónde va (en pulsos de la canción) y cómo se pinta. */
export interface MarcaRegla {
  pulso: number;
  /** true si va entre dos pulsos: se pinta en otro color. */
  aContratiempo: boolean;
  tecla: 'accion' | 'alterna';
}

/** Marcas de la regla a partir de las notas de la canción. */
export function marcasDeLaRegla(
  notas: { pulso: number; tecla: 'accion' | 'alterna' }[],
): MarcaRegla[] {
  return notas.map((n) => ({
    pulso: n.pulso,
    aContratiempo: !Number.isInteger(n.pulso),
    tecla: n.tecla,
  }));
}

/**
 * Rayas de la regla: una por pulso desde `desde` (el final de la cuenta atrás, donde empieza la
 * música); las de inicio de compás, más marcadas.
 */
export function rayasDeLaRegla(
  desde: number,
  hasta: number,
  pulsosPorCompas: number,
): { pulso: number; compas: boolean }[] {
  const rayas = [];
  for (let p = Math.floor(desde); p <= hasta; p++) {
    rayas.push({ pulso: p, compas: (p - desde) % pulsosPorCompas === 0 });
  }
  return rayas;
}
