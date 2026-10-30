/**
 * Dibuja un combate: fondo, luchadores, chispas de los golpes y marcador.
 * Solo lee el estado del combate; nunca lo cambia.
 *
 * El mundo se pinta a 320 x 180 y se amplía ESCALA veces sin suavizar
 * (pixel art). Los textos se pintan ya a tamaño final para que se lean bien.
 */
import { Combate, esAtaque, Evento, Luchador, segundosRestantes } from '../motor/combate';
import { ATAQUES, COMBATE, ENERGIA_MAXIMA, ESCENARIO, VIDA_MAXIMA } from '../motor/reglas';
import { aclarar, oscurecer } from '../sprites/color';
import { spritePersonaje } from '../sprites/dibujar-personaje';
import { ANIMACIONES, CARGAS, Pose } from '../sprites/poses';
import { fondoEscenario } from './escenario';

export const ESCALA = 3;
export const ANCHO_PANTALLA = ESCENARIO.ancho * ESCALA;
export const ALTO_PANTALLA = ESCENARIO.alto * ESCALA;

/** Punto del sprite que se coloca en la posición del luchador (entre los pies). */
const PIES = { x: 24, y: 53 };
const FUENTE = '"Courier New", monospace';

interface Chispa {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  color: string;
}

/** Lo que se ve pero no afecta a la lucha: chispas, temblor y vida que baja poco a poco. */
export interface Efectos {
  chispas: Chispa[];
  temblor: number;
  vidaMostrada: [number, number];
  ticks: number;
}

export function crearEfectos(): Efectos {
  return { chispas: [], temblor: 0, vidaMostrada: [VIDA_MAXIMA, VIDA_MAXIMA], ticks: 0 };
}

/** Avanza los efectos un tick a partir de lo que ha pasado en el combate. */
export function actualizarEfectos(ef: Efectos, c: Combate): void {
  ef.ticks++;
  for (const evento of c.eventos) crearChispas(ef, evento);
  for (const ch of ef.chispas) {
    ch.x += ch.vx;
    ch.y += ch.vy;
    ch.vy += 0.15;
    ch.vida--;
  }
  ef.chispas = ef.chispas.filter((ch) => ch.vida > 0);
  ef.temblor = Math.max(0, ef.temblor - 0.5);
  c.luchadores.forEach((l, i) => {
    // La barra roja alcanza a la vida real con retraso
    if (ef.vidaMostrada[i] > l.vida)
      ef.vidaMostrada[i] = Math.max(l.vida, ef.vidaMostrada[i] - 0.6);
    else ef.vidaMostrada[i] = l.vida;
  });
}

function crearChispas(ef: Efectos, e: Evento): void {
  if (e.tipo !== 'golpe' && e.tipo !== 'bloqueo') return;
  const bloqueo = e.tipo === 'bloqueo';
  const cantidad = bloqueo ? 5 : e.ataque === 'especial' ? 18 : 9;
  const colores = bloqueo ? ['#ffffff', '#9fd8ff'] : ['#ffffff', '#ffe066', '#ff9f43'];
  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const fuerza = 1 + Math.random() * (bloqueo ? 1.5 : 2.5);
    ef.chispas.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(angulo) * fuerza,
      vy: Math.sin(angulo) * fuerza - 1,
      vida: 8 + Math.floor(Math.random() * 8),
      color: colores[i % colores.length],
    });
  }
  ef.temblor = Math.max(ef.temblor, bloqueo ? 1 : e.ataque === 'especial' ? 5 : 2.5);
}

/** Elige el fotograma según lo que está haciendo el luchador. */
export function poseDe(l: Luchador, ticksEfectos: number): Pose {
  if (esAtaque(l.estado)) {
    const a = ATAQUES[l.estado];
    if (l.ticks < a.arranque) return CARGAS[l.estado];
    // Al final de la recuperación ya vuelve a la guardia
    if (l.ticks > a.arranque + a.activo + a.recuperacion * 0.6) return ANIMACIONES.reposo[0];
    return ANIMACIONES[l.estado][0];
  }
  if (l.estado === 'ko') return ANIMACIONES.golpeado[0];
  const fotogramas = ANIMACIONES[l.estado];
  const ritmo = l.estado === 'caminar' ? 8 : 14;
  return fotogramas[Math.floor(ticksEfectos / ritmo) % fotogramas.length];
}

function dibujarLuchador(ctx: CanvasRenderingContext2D, l: Luchador, ticks: number): void {
  const sprite = spritePersonaje(l.apariencia, poseDe(l, ticks));

  // Sombra: más pequeña cuanto más alto salta
  const altura = ESCENARIO.suelo - l.y;
  const sombra = Math.max(8, 22 - altura / 3);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(Math.round(l.x - sombra / 2), ESCENARIO.suelo - 1, Math.round(sombra), 2);

  ctx.save();
  ctx.translate(Math.round(l.x), Math.round(l.y));
  ctx.scale(l.mira, 1);
  if (l.estado === 'ko') {
    // Cae de espaldas girando sobre los pies
    const t = Math.min(1, l.ticks / 18);
    ctx.translate(0, -10 * t);
    ctx.rotate((-Math.PI / 2) * t);
  }
  // Parpadeo blanco al recibir el golpe
  if (l.estado === 'golpeado' && l.ticks < 4) ctx.filter = 'brightness(3)';
  ctx.drawImage(sprite, -PIES.x, -PIES.y);
  ctx.restore();

  // Bola de energía del especial mientras está activo
  if (l.estado === 'especial' && l.ticks >= ATAQUES.especial.arranque - 2) {
    const fin = ATAQUES.especial.arranque + ATAQUES.especial.activo;
    if (l.ticks < fin + 4) {
      const avance = Math.min(1, (l.ticks - ATAQUES.especial.arranque + 2) / 8);
      const cx = l.x + l.mira * (20 + avance * 12);
      const cy = l.y - 28;
      const r = 4 + avance * 4 + (ticks % 4 < 2 ? 1 : 0);
      ctx.fillStyle = oscurecer(l.apariencia.ropa, 0.1);
      ctx.fillRect(
        Math.round(cx - r),
        Math.round(cy - r + 1),
        Math.round(r * 2),
        Math.round(r * 2 - 2),
      );
      ctx.fillStyle = aclarar(l.apariencia.ropa, 0.5);
      ctx.fillRect(
        Math.round(cx - r + 2),
        Math.round(cy - r + 2),
        Math.round(r * 2 - 4),
        Math.round(r * 2 - 4),
      );
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(cx - 2), Math.round(cy - 2), 4, 4);
    }
  }
}

export function dibujarCombate(ctx: CanvasRenderingContext2D, c: Combate, ef: Efectos): void {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ANCHO_PANTALLA, ALTO_PANTALLA);

  // Mundo, ampliado y con temblor
  const dx = ef.temblor ? Math.round((Math.random() - 0.5) * ef.temblor) : 0;
  const dy = ef.temblor ? Math.round((Math.random() - 0.5) * ef.temblor) : 0;
  ctx.setTransform(ESCALA, 0, 0, ESCALA, dx * ESCALA, dy * ESCALA);
  ctx.drawImage(fondoEscenario(), 0, 0);
  // Quien golpea se dibuja delante y quien está en el suelo, detrás
  const [a, b] = c.luchadores;
  const bDelante = (esAtaque(b.estado) && !esAtaque(a.estado)) || a.estado === 'ko';
  const orden = bDelante ? [a, b] : [b, a];
  for (const l of orden) dibujarLuchador(ctx, l, ef.ticks);
  for (const ch of ef.chispas) {
    ctx.fillStyle = ch.color;
    const t = ch.vida > 6 ? 2 : 1;
    ctx.fillRect(Math.round(ch.x), Math.round(ch.y), t, t);
  }

  // Marcador, a tamaño de pantalla
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  dibujarMarcador(ctx, c, ef);
  dibujarMensaje(ctx, c, ef);
}

function texto(
  ctx: CanvasRenderingContext2D,
  contenido: string,
  x: number,
  y: number,
  tamano: number,
  color: string,
  alineado: CanvasTextAlign = 'left',
  anchoMaximo?: number,
): void {
  ctx.font = `bold ${tamano}px ${FUENTE}`;
  ctx.textAlign = alineado;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText(contenido, x + 3, y + 3, anchoMaximo); // sombra dura, sin desenfoque
  ctx.fillStyle = color;
  ctx.fillText(contenido, x, y, anchoMaximo);
}

function barra(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  partes: { valor: number; color: string }[],
  haciaIzquierda: boolean,
): void {
  ctx.fillStyle = '#000000';
  ctx.fillRect(x - 3, y - 3, ancho + 6, alto + 6);
  ctx.fillStyle = '#3a2a3a';
  ctx.fillRect(x, y, ancho, alto);
  for (const parte of partes) {
    const w = Math.round(ancho * Math.max(0, Math.min(1, parte.valor)));
    ctx.fillStyle = parte.color;
    ctx.fillRect(haciaIzquierda ? x + ancho - w : x, y, w, alto);
  }
}

function dibujarMarcador(ctx: CanvasRenderingContext2D, c: Combate, ef: Efectos): void {
  const anchoBarra = 360;
  const margen = 30;
  c.luchadores.forEach((l, i) => {
    const izquierda = i === 0;
    const x = izquierda ? margen : ANCHO_PANTALLA - margen - anchoBarra;
    const vida = l.vida / VIDA_MAXIMA;
    const colorVida = vida > 0.5 ? '#7bed6f' : vida > 0.25 ? '#ffd23f' : '#ff5d5d';
    barra(
      ctx,
      x,
      24,
      anchoBarra,
      24,
      [
        { valor: ef.vidaMostrada[i] / VIDA_MAXIMA, color: '#c0392b' },
        { valor: vida, color: colorVida },
      ],
      !izquierda,
    );
    // Brillo en la parte de arriba de la barra
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, 24, anchoBarra, 6);

    const xNombre = izquierda ? x : x + anchoBarra;
    texto(
      ctx,
      l.nombre.toUpperCase(),
      xNombre,
      68,
      22,
      '#ffffff',
      izquierda ? 'left' : 'right',
      anchoBarra - 70,
    );

    // Rondas ganadas
    for (let r = 0; r < COMBATE.rondasParaGanar; r++) {
      const cx = izquierda ? x + anchoBarra - 14 - r * 26 : x + 14 + r * 26;
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 10, 58, 20, 20);
      ctx.fillStyle = r < c.victorias[i] ? '#ffd23f' : '#3a2a3a';
      ctx.fillRect(cx - 7, 61, 14, 14);
    }

    // Energía abajo
    const xEnergia = izquierda ? margen : ANCHO_PANTALLA - margen - 220;
    const llena = l.energia >= ENERGIA_MAXIMA;
    const parpadeo = llena && ef.ticks % 20 < 10;
    barra(
      ctx,
      xEnergia,
      ALTO_PANTALLA - 34,
      220,
      14,
      [{ valor: l.energia / ENERGIA_MAXIMA, color: parpadeo ? '#ffffff' : '#4fc3f7' }],
      !izquierda,
    );
    const etiqueta = llena ? '¡ESPECIAL LISTO!' : 'ENERGÍA';
    const xEtiqueta = izquierda ? xEnergia : xEnergia + 220;
    texto(
      ctx,
      etiqueta,
      xEtiqueta,
      ALTO_PANTALLA - 52,
      16,
      llena ? '#ffd23f' : '#cfd8dc',
      izquierda ? 'left' : 'right',
    );
  });

  // Reloj
  const segundos = segundosRestantes(c);
  ctx.fillStyle = '#000000';
  ctx.fillRect(ANCHO_PANTALLA / 2 - 42, 12, 84, 60);
  ctx.fillStyle = '#2b1d4e';
  ctx.fillRect(ANCHO_PANTALLA / 2 - 38, 16, 76, 52);
  const urgente = segundos <= 10 && c.fase === 'luchando';
  texto(
    ctx,
    String(segundos).padStart(2, '0'),
    ANCHO_PANTALLA / 2,
    43,
    40,
    urgente ? '#ff5d5d' : '#ffffff',
    'center',
  );
}

function dibujarMensaje(ctx: CanvasRenderingContext2D, c: Combate, ef: Efectos): void {
  let mensaje = '';
  let color = '#ffffff';
  if (c.fase === 'presentacion') {
    mensaje = c.ticksFase < COMBATE.ticksPresentacion * 0.65 ? `RONDA ${c.ronda}` : '¡LUCHA!';
    color = c.ticksFase < COMBATE.ticksPresentacion * 0.65 ? '#ffffff' : '#ffd23f';
  } else if (c.fase === 'finRonda') {
    if (c.ticksFase < 70) {
      mensaje = c.motivoFin === 'ko' ? 'K.O.' : '¡TIEMPO!';
      color = '#ff5d5d';
    } else {
      mensaje =
        c.ganadorRonda === null
          ? 'EMPATE'
          : `GANA ${c.luchadores[c.ganadorRonda].nombre.toUpperCase()}`;
      color = '#ffd23f';
    }
  }
  if (!mensaje) return;
  // El mensaje entra creciendo
  const entrada = Math.min(1, c.ticksFase / 8);
  const tamano = Math.round(76 * (0.6 + 0.4 * entrada));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, ALTO_PANTALLA / 2 - 60, ANCHO_PANTALLA, 110);
  texto(
    ctx,
    mensaje,
    ANCHO_PANTALLA / 2,
    ALTO_PANTALLA / 2 - 6,
    tamano,
    color,
    'center',
    ANCHO_PANTALLA - 80,
  );
}
