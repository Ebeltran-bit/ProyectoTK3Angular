/**
 * Dibuja el sprite pixel art de un personaje a partir de su aspecto y una pose.
 *
 * Se pinta a tamaño real (48 x 56 píxeles) en un canvas pequeño; después se
 * amplía sin suavizado para que se vean los píxeles. Los sprites se guardan
 * en caché porque cada combinación de aspecto y pose solo se dibuja una vez.
 */
import { Apariencia } from './apariencia';
import { aclarar, oscurecer } from './color';
import { ALTO, ANCHO, Extremidad, Pose, Punto } from './poses';

const CONTORNO = '#141018';
const BOTAS = '#2b2118';
const OJO = '#141018';

type Ctx = CanvasRenderingContext2D;

function pixel(ctx: Ctx, x: number, y: number, color: string, ancho = 1, alto = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), ancho, alto);
}

/** Línea gruesa píxel a píxel (algoritmo de Bresenham estampando cuadrados). */
function linea(ctx: Ctx, a: Punto, b: Punto, grosor: number, color: string): void {
  let x0 = Math.round(a.x);
  let y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  const mitad = Math.floor(grosor / 2);
  for (;;) {
    pixel(ctx, x0 - mitad, y0 - mitad, color, grosor, grosor);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

/** Contorno interior: separa una extremidad del cuerpo que tiene detrás. */
function siluetaExtremidad(ctx: Ctx, e: Extremidad, grosor: number): void {
  linea(ctx, e.inicio, e.medio, grosor + 2, CONTORNO);
  linea(ctx, e.medio, e.fin, grosor + 2, CONTORNO);
}

function brazo(ctx: Ctx, b: Extremidad, manga: string, piel: string, silueta = false): void {
  if (silueta) {
    siluetaExtremidad(ctx, b, 3);
    pixel(ctx, b.fin.x - 3, b.fin.y - 3, CONTORNO, 6, 6);
  }
  linea(ctx, b.inicio, b.medio, 3, manga);
  linea(ctx, b.medio, b.fin, 3, piel);
  pixel(ctx, b.fin.x - 2, b.fin.y - 2, piel, 4, 4); // puño
}

function pierna(ctx: Ctx, pi: Extremidad, color: string, silueta = false): void {
  if (silueta) {
    siluetaExtremidad(ctx, pi, 4);
  }
  linea(ctx, pi.inicio, pi.medio, 4, color);
  linea(ctx, pi.medio, pi.fin, 4, color);
  pixel(ctx, pi.fin.x - 2, pi.fin.y - 1, BOTAS, 6, 3); // bota
}

function torso(ctx: Ctx, pose: Pose, a: Apariencia): void {
  const arriba = Math.round(pose.cuello.y);
  const abajo = Math.round(pose.cadera.y);
  for (let y = arriba; y <= abajo; y++) {
    // Interpolamos el centro para que el torso pueda inclinarse
    const t = (y - arriba) / Math.max(abajo - arriba, 1);
    const cx = Math.round(pose.cuello.x + (pose.cadera.x - pose.cuello.x) * t);
    // Más ancho en los hombros que en la cintura
    const mitad = t < 0.35 ? 5 : 4;
    pixel(ctx, cx - mitad, y, a.ropa, mitad * 2 + 1, 1);
    pixel(ctx, cx - mitad, y, oscurecer(a.ropa, 0.25), 2, 1); // sombra en la espalda
    pixel(ctx, cx + 2, y, aclarar(a.ropa, 0.2), 1, 1); // brillo en el pecho
  }
  pixel(ctx, pose.cuello.x - 1, arriba - 2, oscurecer(a.piel, 0.15), 4, 2); // cuello
  pixel(ctx, pose.cadera.x - 4, abajo - 2, oscurecer(a.pantalon, 0.3), 9, 2); // cinturón
}

function cabeza(ctx: Ctx, pose: Pose, a: Apariencia): void {
  const { x, y } = pose.cabeza;
  const pelo = a.pelo;
  const peloOscuro = oscurecer(a.pelo, 0.3);

  // Coleta, detrás de la cabeza
  if (a.peinado === 'coleta') {
    linea(ctx, { x: x - 1, y: y + 2 }, { x: x - 4, y: y + 9 }, 3, peloOscuro);
  }

  // Cara: cuadrado de 10 x 10 con las esquinas recortadas
  pixel(ctx, x, y + 1, a.piel, 10, 8);
  pixel(ctx, x + 1, y, a.piel, 8, 10);
  pixel(ctx, x, y + 6, oscurecer(a.piel, 0.15), 3, 3); // sombra en la nuca
  pixel(ctx, x + 9, y + 6, a.piel, 2, 2); // nariz y barbilla hacia delante

  // Ojo, mirando a la derecha
  pixel(ctx, x + 6, y + 4, '#ffffff', 2, 2);
  pixel(ctx, x + 7, y + 4, OJO, 1, 2);

  // Pelo
  if (a.peinado !== 'calvo') {
    pixel(ctx, x, y, pelo, 10, 3);
    pixel(ctx, x - 1, y + 1, pelo, 3, 6);
    pixel(ctx, x, y, peloOscuro, 10, 1);
  } else {
    pixel(ctx, x, y + 1, oscurecer(a.piel, 0.1), 3, 2); // pelo rapado
  }
  if (a.peinado === 'pinchos') {
    for (let i = 0; i < 4; i++) {
      pixel(ctx, x + i * 3, y - 2, pelo, 2, 2);
      pixel(ctx, x + i * 3 - 1, y - 3, pelo, 1, 1);
    }
  }

  // Accesorio
  if (a.accesorio === 'cinta') {
    pixel(ctx, x - 1, y + 3, a.ropa, 11, 2);
    linea(ctx, { x: x - 2, y: y + 4 }, { x: x - 6, y: y + 7 }, 1, a.ropa); // cintas al aire
    linea(ctx, { x: x - 2, y: y + 4 }, { x: x - 5, y: y + 9 }, 1, oscurecer(a.ropa, 0.25));
  } else if (a.accesorio === 'gorra') {
    pixel(ctx, x - 1, y - 1, a.ropa, 11, 4);
    pixel(ctx, x + 8, y + 2, oscurecer(a.ropa, 0.3), 5, 1); // visera
    pixel(ctx, x - 1, y - 1, aclarar(a.ropa, 0.25), 6, 1);
  } else if (a.accesorio === 'mascara') {
    pixel(ctx, x + 2, y + 6, '#2b2b35', 9, 4);
    pixel(ctx, x + 2, y + 6, '#3d3d4a', 9, 1);
  }
}

/** Contorno de 1 píxel alrededor de todo lo dibujado: el toque clásico del pixel art. */
function contornear(ctx: Ctx): void {
  const imagen = ctx.getImageData(0, 0, ANCHO, ALTO);
  const d = imagen.data;
  const opaco = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < ANCHO && y < ALTO && d[(y * ANCHO + x) * 4 + 3] > 0;
  const bordes: number[] = [];
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (
        !opaco(x, y) &&
        (opaco(x - 1, y) || opaco(x + 1, y) || opaco(x, y - 1) || opaco(x, y + 1))
      ) {
        bordes.push(x, y);
      }
    }
  }
  for (let i = 0; i < bordes.length; i += 2) {
    pixel(ctx, bordes[i], bordes[i + 1], CONTORNO);
  }
}

const cache = new Map<string, HTMLCanvasElement>();

/** Devuelve el sprite (48 x 56) del personaje en esa pose, mirando a la derecha. */
export function spritePersonaje(apariencia: Apariencia, pose: Pose): HTMLCanvasElement {
  const clave = JSON.stringify(apariencia) + JSON.stringify(pose);
  const guardado = cache.get(clave);
  if (guardado) {
    return guardado;
  }

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d')!;

  // Orden: lo de atrás primero
  brazo(ctx, pose.brazoAtras, oscurecer(apariencia.ropa, 0.35), oscurecer(apariencia.piel, 0.2));
  pierna(ctx, pose.piernaAtras, oscurecer(apariencia.pantalon, 0.25));
  torso(ctx, pose, apariencia);
  pierna(ctx, pose.piernaDelante, apariencia.pantalon, true);
  cabeza(ctx, pose, apariencia);
  brazo(ctx, pose.brazoDelante, apariencia.ropa, apariencia.piel, true);
  contornear(ctx);

  cache.set(clave, lienzo);
  return lienzo;
}
