/**
 * Primitivas de dibujo en estilo cómic: contorno negro grueso, colores vivos,
 * una sombra con trama de puntos de imprenta y un brillo en cada forma.
 * Todo se dibuja en un espacio de 160 x 90 unidades que se amplía al tamaño del lienzo.
 */
import { VistaEscena } from './tipos';

export const ANCHO = 160;
export const ALTO = 90;
export const TINTA = '#141019';
const GROSOR = 1.15;
/** Cuánto se oscurece la sombra y cuánto se aclara el brillo de cada color. */
const SOMBRA = 0.24;
const BRILLO = 0.3;
/** Las formas más pequeñas que esto (en unidades) no llevan sombra: serían ruido. */
const TAM_MINIMO_SOMBRA = 2.2;
/** La trama de puntos solo va en formas grandes (paredes, muebles): en caras parecería barba. */
const TAM_MINIMO_TRAMA = 18;

/** Aclara (k > 0) u oscurece (k < 0) un color #rrggbb. */
export function tono(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) =>
    Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  const r = canal(n >> 16);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/** Trama de puntos de imprenta. Se crea una vez por lienzo. */
const tramas = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();
function trama(c: CanvasRenderingContext2D): CanvasPattern | null {
  if (!tramas.has(c)) {
    const t = document.createElement('canvas');
    t.width = t.height = 16;
    const g = t.getContext('2d')!;
    g.fillStyle = 'rgba(20, 16, 25, 0.22)';
    g.beginPath();
    g.arc(8, 8, 3.4, 0, Math.PI * 2);
    g.fill();
    const patron = c.createPattern(t, 'repeat');
    // 16 píxeles de la trama ocupan 1,4 unidades del dibujo
    patron?.setTransform(new DOMMatrix().scale(1.4 / 16));
    tramas.set(c, patron);
  }
  return tramas.get(c) ?? null;
}

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

/**
 * Rellena y perfila una forma. Si es grande y de un color #rrggbb, le pone
 * sombra abajo a la derecha (con trama) y brillo arriba a la izquierda: la
 * sombra es la parte de la forma que queda fuera de una copia desplazada.
 */
function trazar(
  c: CanvasRenderingContext2D,
  forma: Path2D,
  relleno: string | null,
  contorno: boolean,
  tam: number,
): void {
  if (relleno) {
    c.fillStyle = relleno;
    c.fill(forma);
    if (tam >= TAM_MINIMO_SOMBRA && /^#[0-9a-f]{6}$/i.test(relleno)) {
      const d = Math.min(2.6, tam * 0.2);
      c.save();
      c.clip(forma);
      c.fillStyle = tono(relleno, -SOMBRA);
      c.fill(fueraDe(forma, -d, -d * 0.8), 'evenodd');
      const puntos = trama(c);
      if (puntos && tam >= TAM_MINIMO_TRAMA) {
        c.fillStyle = puntos;
        c.fill(fueraDe(forma, -d, -d * 0.8), 'evenodd');
      }
      c.fillStyle = tono(relleno, BRILLO);
      c.fill(fueraDe(forma, d * 0.4, d * 0.4), 'evenodd');
      c.restore();
    }
  }
  if (contorno) c.stroke(forma);
}

/** Un rectángulo enorme con un agujero con la forma desplazada (dx, dy). */
function fueraDe(forma: Path2D, dx: number, dy: number): Path2D {
  const p = new Path2D();
  p.rect(-2000, -2000, 4000, 4000);
  p.addPath(forma, new DOMMatrix().translate(dx, dy));
  return p;
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
  const p = new Path2D();
  p.roundRect(x, y, w, h, radio);
  trazar(c, p, relleno, contorno, Math.min(w, h));
}

export function circ(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  relleno: string,
  contorno = true,
): void {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  trazar(c, p, relleno, contorno, r * 2);
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
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rotacion, 0, Math.PI * 2);
  trazar(c, p, relleno, contorno, Math.min(rx, ry) * 2);
}

/** Polígono a partir de una lista plana de puntos [x1, y1, x2, y2, ...]. */
export function poli(
  c: CanvasRenderingContext2D,
  puntos: number[],
  relleno: string,
  contorno = true,
): void {
  const p = new Path2D();
  p.moveTo(puntos[0], puntos[1]);
  for (let i = 2; i < puntos.length; i += 2) p.lineTo(puntos[i], puntos[i + 1]);
  p.closePath();
  trazar(c, p, relleno, contorno, ladoMenor(puntos));
}

/** Lado menor de la caja que envuelve unos puntos: decide si la forma lleva sombra. */
function ladoMenor(puntos: number[]): number {
  const xs = puntos.filter((_, i) => i % 2 === 0);
  const ys = puntos.filter((_, i) => i % 2 === 1);
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** Forma libre: `camino` dibuja sobre un Path2D y aquí se rellena con el estilo cómic. */
export function forma(
  c: CanvasRenderingContext2D,
  camino: (p: Path2D) => void,
  relleno: string,
  tam = 10,
  contorno = true,
): void {
  const p = new Path2D();
  camino(p);
  p.closePath();
  trazar(c, p, relleno, contorno, tam);
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
  /** Color del pantalón (por defecto, azul oscuro). */
  pantalon?: string;
  /** Ángulo del brazo delantero en radianes (0 = hacia abajo). */
  brazo?: number;
  /** 1 mira a la derecha, -1 a la izquierda. */
  mira?: number;
  /** Boca abierta de alegría (por ejemplo, justo después de un acierto). */
  contento?: boolean;
  gorro?: (c: CanvasRenderingContext2D, x: number, y: number) => void;
}

/** Persona de cómic con los pies en (x, y): cabeza grande, ojos con brillo y brazo que se mueve. */
export function persona(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: OpcionesPersona,
): void {
  const mira = o.mira ?? 1;
  const brazo = o.brazo ?? 0;
  const pantalon = o.pantalon ?? '#2b3a67';
  elip(c, x, y + 0.4, 8, 1.4, 'rgba(20, 16, 25, 0.18)', 0, false);
  // Piernas y zapatos
  caja(c, x - 4.6, y - 10, 4, 10, pantalon, 1);
  caja(c, x + 0.6, y - 10, 4, 10, tono(pantalon, -0.15), 1);
  elip(c, x - 2.6 + mira * 1.2, y - 0.4, 3, 1.5, TINTA);
  elip(c, x + 2.6 + mira * 1.2, y - 0.4, 3, 1.5, TINTA);
  // Cuerpo con cuello de la camisa
  caja(c, x - 7, y - 23, 14, 15, o.ropa, 5);
  poli(c, [x - 2.6, y - 23, x, y - 19.6, x + 2.6, y - 23], '#ffffff');
  // Brazo delantero
  const hx = x + 4.4 * mira;
  const hy = y - 19;
  const mx = hx + Math.sin(brazo) * 9 * mira;
  const my = hy + Math.cos(brazo) * 9;
  raya(c, [hx, hy, mx, my], 4);
  raya(c, [hx, hy, mx, my], 2.2, o.ropa);
  circ(c, mx, my, 2, o.piel);
  // Cabeza: oreja, cara, pelo con flequillo
  circ(c, x - 6.4 * mira, y - 29, 2, o.piel);
  circ(c, x, y - 30, 8.2, o.piel);
  if (o.pelo) {
    forma(
      c,
      (p) => {
        p.moveTo(x - 8.4, y - 28);
        p.bezierCurveTo(x - 9.5, y - 42, x + 9.5, y - 42, x + 8.4, y - 30);
        p.quadraticCurveTo(x + 5 * mira, y - 36, x - 1 * mira, y - 34.5);
        p.quadraticCurveTo(x - 4 * mira, y - 33, x - 7 * mira, y - 26);
      },
      o.pelo,
      8,
    );
  }
  // Ojos: blanco, pupila mirando hacia delante y un punto de brillo
  c.lineWidth = 0.6;
  for (const ox of [1.6, 5.2]) {
    elip(c, x + ox * mira, y - 30.5, 1.5, 2, '#ffffff', 0, true);
    circ(c, x + (ox + 0.4) * mira, y - 30.2, 0.9, TINTA, false);
    circ(c, x + (ox + 0.1) * mira, y - 30.8, 0.32, '#ffffff', false);
  }
  c.lineWidth = GROSOR;
  raya(c, [x + 0.4 * mira, y - 33.6, x + 2.8 * mira, y - 34], 0.8);
  raya(c, [x + 4.2 * mira, y - 34, x + 6.4 * mira, y - 33.4], 0.8);
  // Boca y mofletes
  if (o.contento) {
    forma(
      c,
      (p) => {
        p.moveTo(x + 1.6 * mira, y - 26.6);
        p.quadraticCurveTo(x + 4 * mira, y - 22.6, x + 6.4 * mira, y - 26.6);
      },
      '#c2364f',
      2,
    );
  } else {
    c.beginPath();
    c.moveTo(x + 2.2 * mira, y - 26.4);
    c.quadraticCurveTo(x + 4 * mira, y - 25, x + 5.8 * mira, y - 26.4);
    c.lineWidth = 0.8;
    c.stroke();
    c.lineWidth = GROSOR;
  }
  elip(c, x + 6.6 * mira, y - 27.4, 1.4, 0.9, '#ff8fa3', 0, false);
  elip(c, x - 1.4 * mira, y - 27.4, 1.4, 0.9, '#ff8fa3', 0, false);
  o.gorro?.(c, x, y - 30);
}

/** El último golpe juzgado, si fue hace poco: sirve para enseñar una onomatopeya. */
export function ultimoGolpe(
  v: VistaEscena,
  duracion = 0.6,
): { acierto: boolean; k: number; indice: number } | null {
  for (let i = v.notas.length - 1; i >= 0; i--) {
    const n = v.notas[i];
    if (n.juicio === null) continue;
    const pasado = v.pulso - n.pulso;
    if (pasado < -0.3 || pasado > duracion) continue;
    return { acierto: n.juicio !== 'miss', k: Math.max(0, pasado) / duracion, indice: i };
  }
  return null;
}

/**
 * Onomatopeya de cómic dentro de una explosión (¡ZAS!, ¡CHOF!...). k va de 0 a 1
 * mientras se ve: crece de golpe al principio y se desvanece al final.
 */
export function onomatopeya(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  texto: string,
  k: number,
  color = '#fff36b',
): void {
  const escala = (0.75 + Math.sin(Math.min(1, k * 3) * (Math.PI / 2)) * 0.35) * (1 - k * 0.15);
  c.save();
  c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
  c.translate(x, y);
  c.rotate(-0.12);
  c.scale(escala, escala);
  const puntas: number[] = [];
  for (let i = 0; i < 22; i++) {
    const r = i % 2 ? 6.5 : 10;
    const a = (i / 22) * Math.PI * 2;
    puntas.push(Math.cos(a) * r * 1.5, Math.sin(a) * r);
  }
  poli(c, puntas, color);
  c.font = '900 6.4px "Arial Black", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 1.6;
  c.strokeText(texto, 0, 0.4);
  c.fillStyle = '#ffffff';
  c.fillText(texto, 0, 0.4);
  c.restore();
}

/**
 * Lo habitual en todas las escenas: tras un acierto sale una palabra de la
 * lista (va rotando) y tras un fallo, «¡UY!» en rojo.
 */
export function golpeDeComic(
  c: CanvasRenderingContext2D,
  v: VistaEscena,
  x: number,
  y: number,
  palabras: string[],
): void {
  const golpe = ultimoGolpe(v);
  if (!golpe) return;
  if (golpe.acierto) onomatopeya(c, x, y, palabras[golpe.indice % palabras.length], golpe.k);
  else onomatopeya(c, x, y, '¡UY!', golpe.k, '#ff6b6b');
}

/** Estrella de cinco puntas con centro en (x, y). */
export function estrella(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  relleno: string,
): void {
  const puntos: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radio = i % 2 ? r * 0.45 : r;
    puntos.push(x + Math.cos(a) * radio, y + Math.sin(a) * radio);
  }
  poli(c, puntos, relleno);
}
