/**
 * Escenario fácil: Puerto de las gaviotas.
 * Una gaviota grazna, vuela hacia el poste y se posa en él un pulso después:
 * justo entonces el pescador le lanza una sardina.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  fondo,
  forma,
  persona,
  poli,
  raya,
  textoDeGolpe,
  TINTA,
  tono,
} from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const BLANCO = '#ffffff';
const GRIS = '#c3cad8';
const NARANJA = '#ffa531';
const ROJO = '#ff6b6b';
const AMARILLO = '#ffc93c';
const AZUL = '#5aa0c8';
const MADERA = '#c98b55';
const MADERA_OSCURA = '#9c653a';

/**
 * Gaviota de perfil. mira: 1 si mira a la derecha, -1 a la izquierda. Orden de dibujo:
 * cola, patas, cuerpo, ala y cabeza al final, así el ala nunca tapa la cara.
 */
function gaviota(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  ala: 'arriba' | 'abajo' | 'plegada',
  triste = false,
  mira: 1 | -1 = 1,
): void {
  c.save();
  c.translate(x, y);
  c.scale(mira * 1.3, 1.3);
  poli(c, [-5, -0.5, -11, -2.8, -10.4, 2], GRIS, false);
  if (ala === 'plegada') {
    for (const d of [-1.2, 1.8]) raya(c, [d, 3, d, 6.4, d + 1.4, 6.4], 0.8, NARANJA);
  } else {
    for (const d of [-1.5, 0.8]) raya(c, [d, 3, d - 3, 4.4], 0.8, NARANJA);
  }
  elip(c, 0, 0, 7, 3.9, BLANCO);
  // Ala gris con la punta oscura: la punta es la parte del ala que queda dentro de un rectángulo
  const trazarAla = (p: Path2D) => {
    if (ala === 'plegada') {
      p.moveTo(3, -1.6);
      p.quadraticCurveTo(-3, -3, -9, -0.6);
      p.quadraticCurveTo(-3, 1.8, 2, 0.8);
    } else if (ala === 'arriba') {
      p.moveTo(2.5, -2.2);
      p.quadraticCurveTo(-0.5, -9, -7, -12.5);
      p.quadraticCurveTo(-4.5, -5.5, -3.5, -1.8);
    } else {
      p.moveTo(2.5, -1);
      p.quadraticCurveTo(-1, 5, -7.5, 8);
      p.quadraticCurveTo(-5, 2, -3.5, -0.4);
    }
    p.closePath();
  };
  const contornoAla = new Path2D();
  trazarAla(contornoAla);
  c.fillStyle = GRIS;
  c.fill(contornoAla);
  c.save();
  c.clip(contornoAla);
  c.fillStyle = '#4b5068';
  if (ala === 'plegada') c.fillRect(-10, -4, 3.2, 6);
  else if (ala === 'arriba') c.fillRect(-9, -14, 5, 4.5);
  else c.fillRect(-9, 4.5, 5, 5);
  c.restore();
  circ(c, 5.2, -3.6, 3.4, BLANCO);
  poli(c, [7.9, -4.9, 13, -3.4, 7.9, -2.2], NARANJA, false);
  circ(c, 10.6, -3.1, 0.45, ROJO, false);
  circ(c, 6.3, -4.4, 0.75, TINTA, false);
  circ(c, 6.55, -4.65, 0.25, BLANCO, false);
  if (triste) raya(c, [4.9, -6.6, 7.3, -5.7], 0.6);
  c.restore();
}

function sardina(c: CanvasRenderingContext2D, x: number, y: number, giro = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(giro);
  elip(c, 0, 0, 4.4, 1.7, '#cdd6e4');
  poli(c, [-3.8, 0, -6.6, -1.9, -6.6, 1.9], '#b5c1d4', false);
  circ(c, 2.8, -0.3, 0.35, TINTA, false);
  c.restore();
}

function barco(c: CanvasRenderingContext2D, x: number, y: number): void {
  poli(c, [x - 6, y, x + 6, y, x + 4, y + 2.6, x - 4, y + 2.6], ROJO);
  fondo(c, TINTA, x - 0.3, y - 9, 0.6, 9);
  poli(c, [x + 0.5, y - 8.5, x + 5.5, y - 1.2, x + 0.5, y - 1.2], BLANCO);
  poli(c, [x - 0.5, y - 6.5, x - 4.2, y - 1.2, x - 0.5, y - 1.2], '#ffeccc');
}

/** Nube plana: una píldora con dos bultos encima. */
function nube(c: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  c.fillStyle = '#fff7ec';
  c.beginPath();
  c.roundRect(x - 11 * k, y, 22 * k, 5 * k, 2.5 * k);
  c.arc(x - 3 * k, y + 0.5 * k, 4.5 * k, Math.PI, 0);
  c.arc(x + 4 * k, y + 1.5 * k, 3.2 * k, Math.PI, 0);
  c.fill();
}

function faro(c: CanvasRenderingContext2D, t: number): void {
  // Rocas: tres piedras redondeadas
  elip(c, 146, 55, 13, 6, '#7f88a6');
  elip(c, 134, 56, 7, 4, '#989fb8');
  elip(c, 156, 57, 6, 4, '#727b98');
  // Torre: trapecio blanco con dos franjas rojas y el lado de la sombra
  const torre = new Path2D();
  torre.moveTo(139, 52);
  torre.lineTo(141, 20);
  torre.lineTo(149, 20);
  torre.lineTo(151, 52);
  torre.closePath();
  c.fillStyle = BLANCO;
  c.fill(torre);
  c.save();
  c.clip(torre);
  fondo(c, ROJO, 130, 27, 30, 5);
  fondo(c, ROJO, 130, 38, 30, 5);
  fondo(c, 'rgba(58, 46, 74, 0.12)', 147.5, 20, 6, 33);
  c.restore();
  caja(c, 143, 45, 4, 7, AZUL, 2);
  // Linterna con la luz que gira
  const luz = Math.sin(t * 2) > 0;
  if (luz) poli(c, [145, 15, 114, 8, 114, 22], 'rgba(255, 244, 190, 0.55)', false);
  caja(c, 140, 17.5, 10, 3, TINTA, 1, false);
  caja(c, 141, 11, 8, 7, luz ? '#fff07a' : '#ffd84d', 1.5);
  poli(c, [139, 11.5, 145, 6, 151, 11.5], ROJO);
  circ(c, 145, 5.8, 0.9, ROJO, false);
}

function muelle(c: CanvasRenderingContext2D): void {
  // Pilotes en el agua con su reflejo
  for (let x = 8; x < 96; x += 17) {
    caja(c, x, 66, 5, 26, MADERA_OSCURA, 1.5);
    fondo(c, 'rgba(255, 255, 255, 0.35)', x, 74 + (x % 3), 5, 0.8);
  }
  // Tablero: cara de arriba clara y cara frontal con las juntas
  fondo(c, tono(MADERA, 0.15), -2, 61, 98, 3);
  caja(c, -4, 63.5, 100, 4.5, MADERA, 1);
  for (let x = 8; x < 96; x += 11) fondo(c, tono(MADERA, -0.12), x, 63.8, 0.6, 3.8);
  // Salvavidas: aro blanco con cuatro bandas rojas
  c.save();
  const aro = new Path2D();
  aro.arc(60, 72, 4.6, 0, Math.PI * 2);
  aro.arc(60, 72, 2.3, 0, Math.PI * 2, true);
  c.fillStyle = BLANCO;
  c.fill(aro, 'evenodd');
  c.clip(aro, 'evenodd');
  c.fillStyle = ROJO;
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    c.beginPath();
    c.moveTo(60, 72);
    c.arc(60, 72, 5, a + 0.35, a + 1.15);
    c.closePath();
    c.fill();
  }
  c.restore();
  raya(c, [57, 64, 60, 67.4, 63, 64], 0.6, '#e9d6a8');
}

function decorado(c: CanvasRenderingContext2D, t: number): void {
  // Cielo en tres franjas, sin degradado
  fondo(c, '#ffe6b8', 0, 0, ANCHO, 22);
  fondo(c, '#ffcf9e', 0, 22, ANCHO, 15);
  fondo(c, '#ffb48f', 0, 37, ANCHO, 16);
  // Sol medio escondido tras el horizonte
  c.save();
  c.beginPath();
  c.rect(0, 0, ANCHO, 52);
  c.clip();
  circ(c, 112, 50, 19, '#ffdfb0', false);
  circ(c, 112, 50, 13, '#fff4c9', false);
  c.restore();
  const n = (t * 1.4) % (ANCHO + 50);
  nube(c, n - 25, 12, 1);
  nube(c, ((n + 85) % (ANCHO + 50)) - 25, 25, 0.7);
  // Gaviotas lejanas: dos arcos simples
  for (let i = 0; i < 3; i++) {
    const gx = 36 + i * 13 + Math.sin(t + i) * 2;
    const gy = 9 + (i % 2) * 4;
    raya(
      c,
      [gx - 2.2, gy, gx - 1, gy - 0.8, gx, gy + 0.2, gx + 1, gy - 0.8, gx + 2.2, gy],
      0.6,
      '#a6735e',
    );
  }
  // Islas lejanas en el horizonte
  c.fillStyle = '#f09d8c';
  c.beginPath();
  c.ellipse(20, 52.5, 26, 4.5, 0, Math.PI, 0);
  c.ellipse(52, 52.5, 14, 3, 0, Math.PI, 0);
  c.fill();
  // Mar en dos franjas y reflejo del sol en píldoras
  fondo(c, '#3f9bd6', 0, 52, ANCHO, 38);
  fondo(c, '#2f82bd', 0, 72, ANCHO, 18);
  for (const [y, w] of [
    [54.5, 22],
    [58, 16],
    [62, 11],
    [66.5, 7],
  ])
    caja(c, 112 - w / 2, y, w, 1.6, '#ffe3a3', 0.8, false);
  barco(c, 92 + ((t * 1.2) % 12), 50.5);
  for (let i = 0; i < 8; i++) {
    const x = ((i * 23 + t * 7) % (ANCHO + 20)) - 10;
    const y = 60 + (i % 3) * 9;
    raya(c, [x, y, x + 3, y - 1.2, x + 6, y], 0.8, 'rgba(255, 255, 255, 0.7)');
  }
  faro(c, t);
  muelle(c);
  // Poste de amarre con la cuerda enrollada
  caja(c, 72.5, 44, 7, 18, MADERA, 2);
  elip(c, 76, 44, 3.5, 1.3, tono(MADERA, 0.22), 0, false);
  for (const y of [51, 53.3]) caja(c, 72, y, 8, 1.6, '#f0dfb4', 0.8, false);
  // Cubo con sardinas asomando
  sardina(c, 19.5, 52.4, -0.25);
  sardina(c, 23.5, 52, Math.PI + 0.3);
  poli(c, [14.5, 53, 28.5, 53, 27, 61.5, 16, 61.5], AZUL);
  caja(c, 14, 52.5, 15, 1.8, tono(AZUL, 0.25), 1, false);
}

/** Gorro de lluvia del pescador: copa redonda y ala que cae hacia los lados. */
function gorroDeLluvia(c: CanvasRenderingContext2D, x: number, y: number): void {
  forma(
    c,
    (p) => {
      p.moveTo(x - 10.2, y - 1.4);
      p.quadraticCurveTo(x - 9, y - 4.6, x - 6.2, y - 4.8);
      p.bezierCurveTo(x - 6, y - 12, x + 6, y - 12, x + 6.2, y - 4.8);
      p.quadraticCurveTo(x + 9, y - 4.6, x + 10.2, y - 1.4);
      p.quadraticCurveTo(x, y - 4.8, x - 10.2, y - 1.4);
    },
    AMARILLO,
    9,
  );
  raya(c, [x - 6, y - 5, x, y - 5.7, x + 6, y - 5], 0.5, tono(AMARILLO, -0.14));
}

/** Pulsos que la gaviota se queda en el poste tras recibir la sardina, antes de irse. */
const ESPERA = 0.35;

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  decorado(c, t);
  const lanzando = v.desdePulsacion < 0.15;
  persona(c, 38, 62, {
    ropa: AMARILLO,
    piel: '#f6c7a4',
    pelo: '#d8d3cc',
    bigote: '#e2ddd5',
    brazo: lanzando ? 2.3 : 0.25,
    contento: lanzando,
    gorro: gorroDeLluvia,
  });

  // Cada gaviota vuela hacia el poste durante el pulso y medio anterior a su nota
  const aleteo = Math.floor(t * 10) % 2 === 0 ? 'arriba' : 'abajo';
  for (const n of v.notas) {
    const falta = n.pulso - v.pulso;
    if (falta > 1.6 || falta < -1.1) continue;
    if (falta > 0) {
      // Llega mirando hacia el pescador; en el último cuarto de pulso pliega las alas para posarse
      const k = 1 - falta / 1.6;
      const ala = falta < 0.25 ? 'plegada' : aleteo;
      gaviota(c, 172 - k * 96, 36 - Math.sin(k * Math.PI) * 16 - k * 0.4, ala, false, -1);
    } else if (n.juicio === 'perfect' || n.juicio === 'great') {
      // Primero espera posada a que le llegue la sardina; luego se gira y se va volando
      // hacia arriba con la sardina colgando del pico
      const comida = v.desdePulsacion >= 0.18 || -falta > ESPERA;
      if (-falta < ESPERA) {
        gaviota(c, 76, 35.6, 'plegada', false, -1);
        if (comida) sardina(c, 76 - 13.8, 34.8, -Math.PI / 2);
      } else {
        const k = (-falta - ESPERA) / (1.1 - ESPERA);
        const gx = 76 + k * 80;
        const gy = 35.6 - k * 52;
        gaviota(c, gx, gy, aleteo, false, 1);
        sardina(c, gx + 13.8, gy - 0.8, -Math.PI / 2);
      }
    } else {
      gaviota(c, 76, 35.6, 'plegada', n.juicio === 'miss', -1);
    }
  }

  // Sardina en el aire justo después de pulsar
  if (v.desdePulsacion < 0.18) {
    const k = v.desdePulsacion / 0.18;
    sardina(c, 46 + k * 16, 38 - k * 4 - Math.sin(k * Math.PI) * 10, k * 6);
  }
  textoDeGolpe(c, v, 76, 16, ['¡ÑAM!', '¡HOP!', '¡ZAS!']);
};

export const puerto: Escenario = {
  dibujar,
  instrucciones:
    'Cuando una gaviota grazna, se posa en el poste un pulso después. Pulsa J justo cuando toque la madera para lanzarle una sardina.',
  aviso: (m, t) => {
    // Graznido: un tono que cae rápido y un segundo más corto
    const o = m.tono('square', 1200, t, 0.12, 0.07);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    m.tono('square', 1300, t + 0.14, 0.08, 0.05);
  },
  grabados: {
    aviso: () => 'puerto-aviso',
    acierto: () => 'puerto-acierto',
  },
  teclas: { accion: { texto: 'Lanzar sardina' } },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡El puerto entero aplaude!'
      : hype >= 40
        ? 'Las gaviotas están contentas'
        : 'Las gaviotas se han ido a otro muelle',
};
