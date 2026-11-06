/**
 * Escenario medio: Paso de patitos.
 * Mamá pata hace cuac y sus patitos llegan uno a uno al charco: pulsa J
 * para que salten. Cuando llegan dos seguidos, el segundo salta con K.
 */
import { ANCHO, caja, circ, elip, fondo, forma, raya, textoDeGolpe, TINTA, tono } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const X_CHARCO = 80;
/** Piedra del borde del charco: hay que pulsar cuando el patito llega a ella. */
const X_PIEDRA = X_CHARCO - 14;
const AVANCE = 22; // unidades que anda un patito en un pulso

/**
 * Pato de perfil con los pies en el suelo a la altura y + 5 (por la escala).
 * mira: 1 si mira a la derecha, -1 a la izquierda.
 */
function pata(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  escala: number,
  color: string,
  mira = 1,
): void {
  c.save();
  c.translate(x, y);
  c.scale(escala * mira, escala);
  // Patas naranjas, detrás del cuerpo
  elip(c, -1.4, 5, 1.8, 0.8, '#ff9a2e', 0, false);
  elip(c, 2.2, 5, 1.8, 0.8, '#ff9a2e', 0, false);
  // Cuerpo en forma de gota con la cola levantada
  forma(
    c,
    (p) => {
      p.moveTo(6.2, -1.6);
      p.quadraticCurveTo(7.4, 4.8, 0, 4.9);
      p.quadraticCurveTo(-6.2, 4.9, -7.6, 0.4);
      p.lineTo(-9.2, -3.8);
      p.quadraticCurveTo(-5.2, -2.6, -3, -3);
      p.quadraticCurveTo(2, -4.6, 6.2, -1.6);
    },
    color,
    9,
  );
  // Ala del mismo color, un poco más oscura
  forma(
    c,
    (p) => {
      p.moveTo(-5.2, -0.8);
      p.quadraticCurveTo(0, -3, 3.6, 0.3);
      p.quadraticCurveTo(0, 3.6, -5.2, -0.8);
    },
    tono(color, -0.1),
    3,
    false,
  );
  // Cabeza, pico redondeado y ojo con brillo
  circ(c, 5.4, -5.4, 3.6, color);
  forma(
    c,
    (p) => {
      p.moveTo(8.2, -6);
      p.quadraticCurveTo(11.6, -6.4, 12.6, -4.8);
      p.quadraticCurveTo(11.2, -3.4, 8.4, -3.8);
    },
    '#ff9a2e',
    2,
    false,
  );
  circ(c, 6.6, -6.2, 0.75, TINTA, false);
  circ(c, 6.85, -6.5, 0.26, '#ffffff', false);
  circ(c, 5.4, -4, 0.9, 'rgba(255, 143, 163, 0.5)', false);
  c.restore();
}

const dibujar: DibujarEscena = (c, v) => {
  // Parque: cielo, árboles, valla y camino de tierra
  fondo(c, '#bfe9ff');
  elip(c, 60, 46, 90, 14, '#9ad884');
  fondo(c, '#bfe6a8', 0, 40, ANCHO, 50);
  elip(c, 100 + v.segundos, 10, 12, 4, '#ffffff');
  for (const x of [130, 26]) caja(c, x - 2, 30, 4, 14, '#8a5a36', 1);
  elip(c, 130, 20, 26, 14, '#7cc56a');
  elip(c, 124, 16, 14, 8, '#8fd67a');
  elip(c, 26, 22, 22, 12, '#7cc56a');
  elip(c, 20, 18, 11, 7, '#8fd67a');
  for (let x = 44; x < 112; x += 8) caja(c, x, 38, 2.6, 10, '#ffffff', 0.8);
  raya(c, [42, 41, 114, 41], 1, '#ffffff');
  caja(c, -2, 50, ANCHO + 4, 26, '#e8d3a2', 0.5);
  for (let x = 4; x < ANCHO; x += 17) circ(c, x, 58 + (x % 3) * 4, 0.8, '#c9b07a', false);
  // Juncos y flores en la hierba de abajo
  for (let x = 8; x < ANCHO; x += 19) {
    raya(c, [x, 88, x - 1, 80], 0.8, '#3f8f3a');
    raya(c, [x + 2, 88, x + 3, 81], 0.8, '#3f8f3a');
    circ(c, x + 6, 84, 1.3, x % 38 === 8 ? '#ffd84a' : '#ff8fa3');
  }
  // Charco con ondas
  elip(c, X_CHARCO, 66, 11, 3.5, '#6fc3e8');
  const onda = (v.segundos * 0.8) % 1;
  c.save();
  c.globalAlpha = 1 - onda;
  c.strokeStyle = '#ffffff';
  c.lineWidth = 0.6;
  c.beginPath();
  c.ellipse(X_CHARCO + 2, 66, 3 + onda * 6, 1 + onda * 1.6, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  // La piedra marca el punto de salto
  elip(c, X_PIEDRA, 67.5, 4.2, 1.8, '#b7b2a6');

  // Mamá pata al otro lado del charco; grazna cuando llega un patito
  const cuac = v.notas.some((n) => n.pulso - v.pulso > 0.6 && n.pulso - v.pulso < 1);
  pata(c, 142, 61, 1.2, '#ffffff', -1);
  if (cuac) {
    caja(c, 116, 38, 22, 9, '#ffffff', 3);
    c.save();
    c.font = '700 5.5px system-ui, sans-serif';
    c.fillStyle = TINTA;
    c.textAlign = 'center';
    c.fillText('¡CUAC!', 127, 44);
    c.restore();
  }

  for (const [i, n] of v.notas.entries()) {
    const falta = n.pulso - v.pulso;
    if (falta > 3.6 || falta < -2.2) continue;
    const segundo = v.teclas[i] === 'alterna';
    const color = segundo ? '#ffe9a0' : '#ffd84a';
    // En el pulso de la nota, el patito está encima de la piedra
    const x = X_PIEDRA - falta * AVANCE - 2;
    if (falta > 0) {
      pata(c, x, 64, 0.6, color);
    } else if (n.juicio === null) {
      // Aún se puede pulsar (un GREAT tardío): espera en la piedra, sin caerse todavía
      pata(c, X_PIEDRA - 2, 64, 0.6, color);
    } else if (n.juicio === 'perfect' || n.juicio === 'great') {
      // Salta desde la piedra por encima del charco (dura un pulso) y sigue hacia mamá pata
      const salto = Math.max(0, Math.sin(Math.min(1, -falta) * Math.PI)) * 10;
      pata(c, x, 64 - salto, 0.6, color);
    } else {
      // Ha caído al charco: chapoteo
      pata(c, X_CHARCO - 4, 66, 0.6, color);
      for (let g = 0; g < 4; g++)
        circ(c, X_CHARCO - 8 + g * 5, 60 - (g % 2) * 3 + falta * 2, 0.9, '#6fc3e8', false);
    }
  }
  textoDeGolpe(c, v, 56, 40, ['¡HOP!', '¡BOING!', '¡HUP!']);
};

export const patitos: Escenario = {
  dibujar,
  instrucciones:
    'Mamá pata hace cuac y sus patitos llegan al charco. Pulsa J justo cuando un patito pisa la piedra del borde para que salte el charco. Si vienen dos seguidos, el segundo (más clarito) salta con K.',
  aviso: (m, t, tecla) => {
    // Cuac de mamá pata: grave si es un patito, más agudo si es el segundo de una pareja
    const o = m.tono('sawtooth', tecla === 'accion' ? 330 : 440, t, 0.14, 0.05);
    o.frequency.exponentialRampToValueAtTime(tecla === 'accion' ? 220 : 300, t + 0.14);
  },
  grabados: {
    aviso: () => 'patitos-aviso',
    acierto: () => 'patitos-acierto',
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Todos los patitos secos y felices!'
      : hype >= 40
        ? 'Algún patito mojado, pero bien'
        : 'Mamá pata tendrá que secar a todos',
};
