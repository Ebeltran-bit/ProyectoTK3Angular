/**
 * Compás de demostración (etapa 4, propuesta C): antes de la cuenta, la escena toca sola las
 * primeras notas de la canción para que se vea y se oiga qué hay que hacer.
 *
 * Va aparte de la canción: cuando acaba, la canción empieza igual que siempre, así que los
 * tiempos de las pulsaciones que llegan al backend no cambian. Lo que se pulsa durante la
 * demostración no se guarda.
 */
import { Cancion, NotaCancion } from '../models/cancion';

export interface Demostracion {
  /** Las notas del primer compás que tiene notas, con su pulso de la canción. */
  notas: NotaCancion[];
  /** Pulso de la canción donde empieza: uno antes del primer aviso. */
  desde: number;
  /** Pulso donde acaba: uno después de la última nota. */
  hasta: number;
}

/** Notas y duración de la demostración de una canción (null si la canción no tiene notas). */
export function demostracionDe(cancion: Cancion): Demostracion | null {
  if (cancion.notas.length === 0) return null;
  const primera = cancion.notas[0].pulso;
  const notas = cancion.notas.filter((n) => n.pulso < primera + cancion.pulsos_por_compas);
  return {
    notas,
    desde: primera - cancion.aviso_antes - 1,
    hasta: notas[notas.length - 1].pulso + 1,
  };
}

/*
 * La demostración sale solo la primera vez que se juega cada canción en este navegador
 * (decisión de Eva del 16/11/2026). Se recuerda en localStorage, como el volumen.
 */
const CLAVE = 'tk3_demostraciones';

function vistas(): string[] {
  try {
    const lista: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function demostracionVista(idCancion: string): boolean {
  return vistas().includes(idCancion);
}

export function marcarDemostracionVista(idCancion: string): void {
  try {
    const lista = vistas();
    if (!lista.includes(idCancion))
      localStorage.setItem(CLAVE, JSON.stringify([...lista, idCancion]));
  } catch {
    // Sin almacenamiento: volverá a salir la próxima vez, no pasa nada
  }
}
