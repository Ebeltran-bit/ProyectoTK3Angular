/**
 * Primitivas de dibujo en estilo plano (aprobado por Eva el 06/11/2026, sustituye al cómic):
 * sin contorno negro, colores planos sin degradados y una sola sombra por forma, una
 * media luna abajo a la derecha del mismo color pero más oscuro (la luz viene siempre
 * de arriba a la izquierda).
 * Todo se dibuja en un espacio de 160 x 90 unidades que se amplía al tamaño del lienzo.
 */
import { VistaEscena } from './tipos';

export const ANCHO = 160;
export const ALTO = 90;
/** Color de los detalles oscuros (ojos, rayas finas): morado muy oscuro, como el texto de la web. */
export const TINTA = '#3a2e4a';
const GROSOR = 0.8;
/** Cuánto se oscurece la sombra de cada color. */
const SOMBRA = 0.16;
/** Las formas más pequeñas que esto (en unidades) no llevan sombra: serían ruido. */
const TAM_MINIMO_SOMBRA = 2.2;

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
 * Rellena una forma. Si `sombreado` está activo, es grande y de un color #rrggbb, le
 * pone su sombra plana: la parte de la forma que queda fuera de una copia desplazada
 * hacia arriba a la izquierda.
 */
function trazar(
  c: CanvasRenderingContext2D,
  forma: Path2D,
  relleno: string,
  sombreado: boolean,
  tam: number,
): void {
  c.fillStyle = relleno;
  c.fill(forma);
  if (!sombreado || tam < TAM_MINIMO_SOMBRA || !/^#[0-9a-f]{6}$/i.test(relleno)) return;
  const d = Math.min(1.8, tam * 0.14);
  c.save();
  c.clip(forma);
  c.fillStyle = tono(relleno, -SOMBRA);
  c.fill(fueraDe(forma, -d, -d), 'evenodd');
  c.restore();
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
  sombreado = true,
): void {
  const p = new Path2D();
  p.roundRect(x, y, w, h, radio);
  trazar(c, p, relleno, sombreado, Math.min(w, h));
}

export function circ(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  relleno: string,
  sombreado = true,
): void {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  trazar(c, p, relleno, sombreado, r * 2);
}

export function elip(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  relleno: string,
  rotacion = 0,
  sombreado = true,
): void {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rotacion, 0, Math.PI * 2);
  trazar(c, p, relleno, sombreado, Math.min(rx, ry) * 2);
}

/** Polígono a partir de una lista plana de puntos [x1, y1, x2, y2, ...]. */
export function poli(
  c: CanvasRenderingContext2D,
  puntos: number[],
  relleno: string,
  sombreado = true,
): void {
  const p = new Path2D();
  p.moveTo(puntos[0], puntos[1]);
  for (let i = 2; i < puntos.length; i += 2) p.lineTo(puntos[i], puntos[i + 1]);
  p.closePath();
  trazar(c, p, relleno, sombreado, ladoMenor(puntos));
}

/** Lado menor de la caja que envuelve unos puntos: decide si la forma lleva sombra. */
function ladoMenor(puntos: number[]): number {
  const xs = puntos.filter((_, i) => i % 2 === 0);
  const ys = puntos.filter((_, i) => i % 2 === 1);
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** Forma libre: `camino` dibuja sobre un Path2D y aquí se rellena con el estilo plano. */
export function forma(
  c: CanvasRenderingContext2D,
  camino: (p: Path2D) => void,
  relleno: string,
  tam = 10,
  sombreado = true,
): void {
  const p = new Path2D();
  camino(p);
  p.closePath();
  trazar(c, p, relleno, sombreado, tam);
}

/** Línea abierta con las puntas redondas (patas, olas, detalles finos). */
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

/**
 * Brazo o pierna: una forma que se estrecha del ancho w1 al w2 y se curva un poco
 * (curva > 0 hacia un lado y < 0 hacia el otro), con las puntas redondas. Sin sombra,
 * para que la unión con el cuerpo no marque un borde.
 */
export function extremidad(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w1: number,
  w2: number,
  curva: number,
  color: string,
): void {
  const largo = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / largo;
  const ny = (x2 - x1) / largo;
  const mx = (x1 + x2) / 2 + nx * curva;
  const my = (y1 + y2) / 2 + ny * curva;
  const medio = (w1 + w2) / 4;
  const a = Math.atan2(ny, nx);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
  c.quadraticCurveTo(mx + nx * medio, my + ny * medio, x2 + (nx * w2) / 2, y2 + (ny * w2) / 2);
  c.arc(x2, y2, w2 / 2, a, a + Math.PI);
  c.quadraticCurveTo(mx - nx * medio, my - ny * medio, x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
  c.arc(x1, y1, w1 / 2, a + Math.PI, a);
  c.fill();
}

/** Mano redonda con el pulgar. mira: 1 si el cuerpo mira a la derecha, -1 a la izquierda. */
export function mano(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  piel: string,
  mira = 1,
): void {
  circ(c, x, y, 1.7, piel);
  elip(c, x - 1.2 * mira, y - 0.9, 0.7, 0.55, piel, 0, false);
}

export interface OpcionesPersona {
  ropa: string;
  piel: string;
  pelo?: string;
  /** Color del pantalón (por defecto, azul vaquero). */
  pantalon?: string;
  /** Ángulo del brazo delantero en radianes (0 = hacia abajo). */
  brazo?: number;
  /** 1 mira a la derecha, -1 a la izquierda. */
  mira?: number;
  /** Sonrisa pequeña y ojos cerrados de alegría (por ejemplo, justo después de un acierto). */
  contento?: boolean;
  /** Bigote del color que se indique. */
  bigote?: string;
  /** Lo que lleva en la cabeza: recibe el centro de la cabeza. */
  gorro?: (c: CanvasRenderingContext2D, x: number, y: number) => void;
}

/**
 * Persona en estilo plano con los pies en (x, y). Las medidas de siempre: la cabeza
 * tiene el centro en (x, y - 30) y la mano delantera acaba a 9 unidades del hombro
 * (x + 4,4, y - 19), así los objetos que sujeta cada escena siguen en su sitio.
 * Las piezas que se unen (hombro, codo, muñeca) se dibujan solapadas y del mismo color
 * para que no queden huecos.
 */
export function persona(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: OpcionesPersona,
): void {
  const m = o.mira ?? 1;
  const brazo = o.brazo ?? 0;
  const pantalon = o.pantalon ?? '#4a6797';
  const ropaOscura = tono(o.ropa, -0.14);
  const X = (d: number) => x + d * m;

  elip(c, x, y + 0.3, 8.5, 1.3, 'rgba(58, 46, 74, 0.16)', 0, false);
  // Zapatos: puntera redondeada hacia donde mira
  for (const d of [-3, 2.8]) {
    forma(
      c,
      (p) => {
        p.moveTo(X(d - 2.2), y - 2.8);
        p.lineTo(X(d + 1.2), y - 2.8);
        p.quadraticCurveTo(X(d + 3.4), y - 2.4, X(d + 3.4), y);
        p.lineTo(X(d - 2.4), y);
        p.quadraticCurveTo(X(d - 2.6), y - 1.6, X(d - 2.2), y - 2.8);
      },
      '#33405e',
      3,
    );
  }
  // Pantalón de una pieza, con las perneras separadas por una curva
  forma(
    c,
    (p) => {
      p.moveTo(x - 5.6, y - 12);
      p.lineTo(x + 5.6, y - 12);
      p.quadraticCurveTo(x + 5.9, y - 7, x + 5, y - 2.4);
      p.lineTo(x + 0.9, y - 2.4);
      p.quadraticCurveTo(x + 0.6, y - 7, x, y - 8.2);
      p.quadraticCurveTo(x - 0.6, y - 7, x - 0.9, y - 2.4);
      p.lineTo(x - 5, y - 2.4);
      p.quadraticCurveTo(x - 5.9, y - 7, x - 5.6, y - 12);
    },
    pantalon,
    8,
  );
  // Brazo de atrás: la mano se dibuja antes, así sale de dentro de la manga
  mano(c, X(-6.4), y - 10.6, o.piel, m);
  extremidad(c, X(-4.6), y - 20.5, X(-6.3), y - 12, 3.8, 3, 0.8 * m, ropaOscura);
  // Cuerpo: hombros redondeados y bajo un poco acampanado
  forma(
    c,
    (p) => {
      p.moveTo(x - 3.6, y - 24.2);
      p.quadraticCurveTo(x - 7.4, y - 24, x - 7.2, y - 19.4);
      p.quadraticCurveTo(x - 7.6, y - 13, x - 7.8, y - 9.6);
      p.quadraticCurveTo(x, y - 7.8, x + 7.8, y - 9.6);
      p.quadraticCurveTo(x + 7.6, y - 13, x + 7.2, y - 19.4);
      p.quadraticCurveTo(x + 7.4, y - 24, x + 3.6, y - 24.2);
      p.quadraticCurveTo(x, y - 22.8, x - 3.6, y - 24.2);
    },
    o.ropa,
    14,
  );
  // Cuello: un pico más oscuro
  forma(
    c,
    (p) => {
      p.moveTo(x - 3.8, y - 24.4);
      p.quadraticCurveTo(x, y - 21.6, x + 3.8, y - 24.4);
      p.quadraticCurveTo(x + 2.6, y - 21.8, x, y - 21);
      p.quadraticCurveTo(x - 2.6, y - 21.8, x - 3.8, y - 24.4);
    },
    ropaOscura,
    2,
    false,
  );
  cabeza(c, x, y - 30, m, o);
  o.gorro?.(c, x, y - 30);
  // Brazo delantero: gira desde dentro del cuerpo y la mano sale de la manga
  const hx = X(4.4);
  const hy = y - 19;
  const dx = Math.sin(brazo) * m;
  const dy = Math.cos(brazo);
  const mx = hx + dx * 9;
  const my = hy + dy * 9;
  mano(c, mx, my, o.piel, m);
  extremidad(
    c,
    X(3.8),
    hy - 0.2,
    mx - dx * 1.1,
    my - dy * 1.1,
    4,
    3.1,
    (brazo > 1 ? -0.9 : 0.8) * m,
    o.ropa,
  );
  // Sombra de la manga solo de medio brazo a la muñeca, en el lado contrario a la luz
  let sx = dy;
  let sy = -dx;
  if (sx + sy < 0) {
    sx = -sx;
    sy = -sy;
  }
  raya(
    c,
    [
      hx + dx * 4.5 + sx * 1.5,
      hy + dy * 4.5 + sy * 1.5,
      mx - dx * 1.1 + sx * 1.1,
      my - dy * 1.1 + sy * 1.1,
    ],
    0.8,
    ropaOscura,
  );
}

/** Cabeza con orejas, cara algo ovalada, pelo, ojos con brillo, nariz y boca pequeña. */
function cabeza(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  m: number,
  o: OpcionesPersona,
): void {
  const X = (d: number) => x + d * m;
  const pielOscura = tono(o.piel, -0.08);
  circ(c, x - 6.6, y + 0.6, 1.4, pielOscura, false);
  circ(c, x + 6.6, y + 0.6, 1.4, pielOscura, false);
  elip(c, x, y, 6.7, 7.1, o.piel);
  if (o.pelo) {
    // Casquete con flequillo hacia donde mira; las patillas bajan por los lados
    forma(
      c,
      (p) => {
        p.moveTo(X(-6.9), y + 1.2);
        p.bezierCurveTo(X(-7.8), y - 10.4, X(7.8), y - 10.4, X(6.9), y - 0.4);
        p.quadraticCurveTo(X(6.4), y - 3.4, X(4.6), y - 4.2);
        p.quadraticCurveTo(X(0.6), y - 3.2, X(-2.4), y - 5);
        p.quadraticCurveTo(X(-4.6), y - 3, X(-5.2), y + 1.6);
      },
      o.pelo,
      6,
    );
  }
  // Cejas finas
  raya(
    c,
    [X(-0.4), y - 2.6, X(1), y - 3.1, X(2.2), y - 2.8],
    0.5,
    tono(o.pelo ?? '#8a6d5a', -0.15),
  );
  raya(
    c,
    [X(3.6), y - 2.8, X(4.8), y - 3.1, X(5.6), y - 2.5],
    0.5,
    tono(o.pelo ?? '#8a6d5a', -0.15),
  );
  // Ojos: miran hacia delante; cerrados en arco cuando está contento
  for (const ox of [1, 4.6]) {
    if (o.contento) {
      raya(c, [X(ox - 0.7), y - 0.9, X(ox), y - 1.6, X(ox + 0.7), y - 0.9], 0.5);
    } else {
      elip(c, X(ox), y - 1, 0.6, 0.85, TINTA, 0, false);
      circ(c, X(ox + 0.2), y - 1.35, 0.22, '#ffffff', false);
    }
  }
  // Mejillas, nariz y boca
  circ(c, X(-0.8), y + 1.8, 1, 'rgba(255, 143, 163, 0.45)', false);
  circ(c, X(6), y + 1.6, 0.8, 'rgba(255, 143, 163, 0.45)', false);
  elip(c, X(3), y + 0.9, 1, 0.9, tono(o.piel, -0.1), 0, false);
  if (o.bigote) {
    forma(
      c,
      (p) => {
        p.moveTo(X(0.8), y + 2.6);
        p.quadraticCurveTo(X(2), y + 1.4, X(3), y + 2.1);
        p.quadraticCurveTo(X(4.2), y + 1.4, X(5.4), y + 2.6);
        p.quadraticCurveTo(X(3), y + 2.9, X(0.8), y + 2.6);
      },
      o.bigote,
      2,
      false,
    );
  }
  if (o.contento) {
    forma(
      c,
      (p) => {
        p.moveTo(X(2.2), y + 3.3);
        p.quadraticCurveTo(X(3.2), y + 4.6, X(4.2), y + 3.3);
      },
      '#8a3b4a',
      1,
      false,
    );
  } else {
    raya(c, [X(2.5), y + 3.5, X(3.2), y + 3.75, X(3.9), y + 3.5], 0.4, '#8a3b4a');
  }
}

/** El último golpe juzgado, si fue hace poco: sirve para enseñar una palabra. */
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
 * Palabra del golpe (¡ÑAM!, ¡ZAS!...) sobre una píldora de color, como los botones de
 * la web. k va de 0 a 1 mientras se ve: crece de golpe al principio, sube un poco y se
 * desvanece al final.
 */
export function onomatopeya(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  texto: string,
  k: number,
  color = '#4cc796',
): void {
  const escala = 1 + 0.25 * Math.max(0, 1 - k * 4);
  c.save();
  c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
  c.translate(x, y - k * 3);
  c.scale(escala, escala);
  c.font = '700 6px Fredoka, Nunito, system-ui, sans-serif';
  const w = c.measureText(texto).width + 8;
  // Que la píldora no se salga por los lados del escenario
  const margen = (w / 2) * escala + 2;
  c.translate(Math.max(margen - x, Math.min(ANCHO - margen - x, 0)), 0);
  c.fillStyle = tono(color, -0.25);
  c.beginPath();
  c.roundRect(-w / 2, -3.2, w, 8.4, 4.2);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(-w / 2, -4.2, w, 8.4, 4.2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, 0, 0.4);
  c.restore();
}

/**
 * Lo habitual en todas las escenas: tras un acierto sale una palabra de la lista
 * (va rotando) en verde y tras un fallo, «¡UY!» en rojo.
 */
export function textoDeGolpe(
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
