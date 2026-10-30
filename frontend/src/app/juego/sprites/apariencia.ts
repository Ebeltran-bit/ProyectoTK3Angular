/** Aspecto de un personaje. Lo mismo que guarda la API en tk3_personajes. */
export interface Apariencia {
  piel: string;
  pelo: string;
  ropa: string;
  pantalon: string;
  peinado: Peinado;
  accesorio: Accesorio;
}

export type Peinado = 'corto' | 'pinchos' | 'coleta' | 'calvo';
export type Accesorio = 'ninguno' | 'cinta' | 'gorra' | 'mascara';

export const PEINADOS: { valor: Peinado; nombre: string }[] = [
  { valor: 'corto', nombre: 'Corto' },
  { valor: 'pinchos', nombre: 'Pinchos' },
  { valor: 'coleta', nombre: 'Coleta' },
  { valor: 'calvo', nombre: 'Rapado' },
];

export const ACCESORIOS: { valor: Accesorio; nombre: string }[] = [
  { valor: 'ninguno', nombre: 'Ninguno' },
  { valor: 'cinta', nombre: 'Cinta' },
  { valor: 'gorra', nombre: 'Gorra' },
  { valor: 'mascara', nombre: 'Máscara' },
];

/** Paletas del editor, elegidas para que cualquier combinación se lea bien en pixel art. */
export const PALETAS = {
  piel: ['#fde0c5', '#f1c27d', '#e0a370', '#c68642', '#8d5524', '#5c3a21'],
  pelo: ['#1b1b1f', '#4a2c1a', '#8b5a2b', '#d8b26e', '#e8e3d9', '#c0392b', '#2e86de', '#8e44ad'],
  ropa: ['#e74c3c', '#2e86de', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#2c3e50', '#e84393'],
  pantalon: [
    '#2c3e50',
    '#34495e',
    '#7f8c8d',
    '#ecf0f1',
    '#c0392b',
    '#1e3799',
    '#6d4c41',
    '#111111',
  ],
} as const;

function alAzar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

export function aparienciaAleatoria(): Apariencia {
  return {
    piel: alAzar(PALETAS.piel),
    pelo: alAzar(PALETAS.pelo),
    ropa: alAzar(PALETAS.ropa),
    pantalon: alAzar(PALETAS.pantalon),
    peinado: alAzar(PEINADOS).valor,
    accesorio: alAzar(ACCESORIOS).valor,
  };
}
