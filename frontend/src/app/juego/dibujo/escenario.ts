/**
 * Fondo del combate: un atardecer con montañas y un suelo de madera.
 * Se dibuja una sola vez en un canvas aparte y luego solo se copia.
 */
import { ESCENARIO } from '../motor/reglas';

const CIELO = ['#2b1d4e', '#4b2763', '#7a3170', '#b04367', '#e0665a', '#f59a5b', '#f9c46b'];

let fondo: HTMLCanvasElement | null = null;

/** Altura "aleatoria" pero siempre igual, para que las montañas no cambien. */
function relieve(x: number, semilla: number, altura: number): number {
  return (
    Math.sin(x * 0.031 + semilla) * altura * 0.5 +
    Math.sin(x * 0.083 + semilla * 2) * altura * 0.3 +
    Math.sin(x * 0.17 + semilla * 3) * altura * 0.2
  );
}

export function fondoEscenario(): HTMLCanvasElement {
  if (fondo) return fondo;
  const { ancho, alto, suelo } = ESCENARIO;
  fondo = document.createElement('canvas');
  fondo.width = ancho;
  fondo.height = alto;
  const ctx = fondo.getContext('2d')!;
  const horizonte = suelo - 22;

  // Cielo por bandas, con un tramado de píxeles entre una y otra
  const banda = Math.ceil(horizonte / CIELO.length);
  CIELO.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * banda, ancho, banda);
    if (i > 0) {
      ctx.fillStyle = CIELO[i - 1];
      for (let x = 0; x < ancho; x += 2) ctx.fillRect(x + ((i * banda) % 2), i * banda, 1, 1);
    }
  });

  // Sol
  ctx.fillStyle = '#ffe9a3';
  const sol = { x: 220, y: horizonte - 44, r: 16 };
  for (let y = -sol.r; y <= sol.r; y++) {
    const mitad = Math.round(Math.sqrt(sol.r * sol.r - y * y));
    if (y % 4 !== 3) ctx.fillRect(sol.x - mitad, sol.y + y, mitad * 2, 1); // rayas horizontales
  }

  // Dos cordilleras: la lejana más clara
  const capas = [
    { color: '#8a3e6a', base: horizonte - 10, altura: 34, semilla: 1 },
    { color: '#4a2453', base: horizonte + 2, altura: 22, semilla: 4 },
  ];
  for (const capa of capas) {
    ctx.fillStyle = capa.color;
    for (let x = 0; x < ancho; x++) {
      const cima = Math.round(
        capa.base - capa.altura * 0.5 - relieve(x, capa.semilla, capa.altura),
      );
      ctx.fillRect(x, cima, 1, alto - cima);
    }
  }

  // Suelo de tablas
  const tablas = ['#6b4a34', '#5e412e', '#74503a'];
  for (let y = horizonte + 8; y < alto; y++) {
    const fila = Math.floor((y - horizonte - 8) / 6);
    ctx.fillStyle = tablas[fila % tablas.length];
    ctx.fillRect(0, y, ancho, 1);
  }
  ctx.fillStyle = '#3f2b1f';
  for (let fila = 0; horizonte + 8 + fila * 6 < alto; fila++) {
    const y = horizonte + 8 + fila * 6;
    ctx.fillRect(0, y, ancho, 1);
    // Juntas de las tablas, desplazadas en cada fila
    for (let x = (fila * 37) % 60; x < ancho; x += 60) ctx.fillRect(x, y, 1, 6);
  }
  ctx.fillStyle = '#8c6448';
  ctx.fillRect(0, horizonte + 8, ancho, 1); // borde iluminado

  // Farolillos a los lados
  for (const x of [26, ancho - 30]) {
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(x + 2, horizonte - 30, 2, 38);
    ctx.fillStyle = '#d9483b';
    ctx.fillRect(x - 1, horizonte - 34, 8, 10);
    ctx.fillStyle = '#f7b955';
    ctx.fillRect(x + 1, horizonte - 32, 4, 6);
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(x - 1, horizonte - 35, 8, 1);
    ctx.fillRect(x - 1, horizonte - 24, 8, 1);
  }
  return fondo;
}
