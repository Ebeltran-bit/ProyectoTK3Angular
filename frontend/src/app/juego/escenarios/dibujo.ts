/**
 * Primitivas de dibujo en estilo plano: relleno de un color y contorno negro.
 * Todo se dibuja en un espacio de 160 x 90 unidades que se amplía al tamaño del lienzo.
 */
export const ANCHO = 160;
export const ALTO = 90;
export const TINTA = '#1b1a26';
const GROSOR = 1.1;

/** Ajusta la escala del lienzo para poder dibujar siempre en unidades de 160 x 90. */
export function preparar(c: CanvasRenderingContext2D): void {
  const escala = c.canvas.width / ANCHO;
  c.setTransform(escala, 0, 0, escala, 0, 0);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = GROSOR;
  c.strokeStyle = TINTA;
}

export function fondo(
  c: CanvasRenderingContext2D,
  color: string,
  x = 0,
  y = 0,
  w = ANCHO,
  h = ALTO,
): void {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

function trazar(c: CanvasRenderingContext2D, relleno: string | null, contorno: boolean): void {
  if (relleno) {
    c.fillStyle = relleno;
    c.fill();
  }
  if (contorno) c.stroke();
}

export function caja(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  relleno: string,
  radio = 1.5,
  contorno = true,
): void {
  c.beginPath();
  c.roundRect(x, y, w, h, radio);
  trazar(c, relleno, contorno);
}

export function circ(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  relleno: string,
  contorno = true,
): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  trazar(c, relleno, contorno);
}

export function elip(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  relleno: string,
  rotacion = 0,
  contorno = true,
): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rotacion, 0, Math.PI * 2);
  trazar(c, relleno, contorno);
}

/** Polígono a partir de una lista plana de puntos [x1, y1, x2, y2, ...]. */
export function poli(
  c: CanvasRenderingContext2D,
  puntos: number[],
  relleno: string,
  contorno = true,
): void {
  c.beginPath();
  c.moveTo(puntos[0], puntos[1]);
  for (let i = 2; i < puntos.length; i += 2) c.lineTo(puntos[i], puntos[i + 1]);
  c.closePath();
  trazar(c, relleno, contorno);
}

/** Línea abierta (brazos, patas, olas). */
export function raya(
  c: CanvasRenderingContext2D,
  puntos: number[],
  ancho = GROSOR,
  color = TINTA,
): void {
  c.save();
  c.lineWidth = ancho;
  c.strokeStyle = color;
  c.beginPath();
  c.moveTo(puntos[0], puntos[1]);
  for (let i = 2; i < puntos.length; i += 2) c.lineTo(puntos[i], puntos[i + 1]);
  c.stroke();
  c.restore();
}

export interface OpcionesPersona {
  ropa: string;
  piel: string;
  pelo?: string;
  /** Ángulo del brazo delantero en radianes (0 = hacia abajo). */
  brazo?: number;
  /** 1 mira a la derecha, -1 a la izquierda. */
  mira?: number;
  gorro?: (c: CanvasRenderingContext2D, x: number, y: number) => void;
}

/** Persona redondeada con los pies en (x, y). */
export function persona(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: OpcionesPersona,
): void {
  const mira = o.mira ?? 1;
  const brazo = o.brazo ?? 0;
  raya(c, [x - 3, y - 9, x - 3, y], 2.4);
  raya(c, [x + 3, y - 9, x + 3, y], 2.4);
  elip(c, x - 3 + mira, y, 2.6, 1.2, TINTA);
  elip(c, x + 3 + mira, y, 2.6, 1.2, TINTA);
  caja(c, x - 6.5, y - 22, 13, 15, o.ropa, 5);
  const hx = x + 4 * mira;
  const hy = y - 18;
  const mx = hx + Math.sin(brazo) * 9 * mira;
  const my = hy + Math.cos(brazo) * 9;
  raya(c, [hx, hy, mx, my], 3.2);
  raya(c, [hx, hy, mx, my], 1.6, o.ropa);
  circ(c, mx, my, 1.8, o.piel);
  circ(c, x, y - 29, 8, o.piel);
  if (o.pelo) {
    c.beginPath();
    c.arc(x, y - 29, 8, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
    trazar(c, o.pelo, true);
  }
  circ(c, x + 2.6 * mira, y - 29, 1, TINTA, false);
  circ(c, x + 5.5 * mira, y - 29, 1, TINTA, false);
  elip(c, x + 4 * mira, y - 25.5, 1.6, 0.9, '#ff9eb0', 0, false);
  o.gorro?.(c, x, y - 29);
}
