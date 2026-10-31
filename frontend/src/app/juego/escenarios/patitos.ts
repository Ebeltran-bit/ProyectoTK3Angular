/**
 * Escenario medio: Paso de patitos.
 * Mamá pata hace cuac y sus patitos llegan uno a uno al charco: pulsa J
 * para que salten. Cuando llegan dos seguidos, el segundo salta con K.
 */
import { ANCHO, caja, circ, elip, fondo, poli, TINTA } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const X_CHARCO = 80;
const AVANCE = 22; // unidades que anda un patito en un pulso

function pata(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  escala: number,
  color: string,
): void {
  elip(c, x, y, 7 * escala, 5 * escala, color);
  circ(c, x + 6 * escala, y - 5 * escala, 3.6 * escala, color);
  poli(
    c,
    [
      x + 9 * escala,
      y - 5.6 * escala,
      x + 13 * escala,
      y - 4.6 * escala,
      x + 9 * escala,
      y - 3.4 * escala,
    ],
    '#ff9a2e',
  );
  circ(c, x + 7 * escala, y - 6 * escala, 0.7, TINTA, false);
}

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#bfe6a8');
  elip(c, 130, 20, 26, 14, '#8fcf7a');
  elip(c, 26, 22, 22, 12, '#8fcf7a');
  for (const x of [130, 26]) caja(c, x - 2, 30, 4, 12, '#8a5a36', 1);
  caja(c, -2, 50, ANCHO + 4, 26, '#e8d3a2', 0.5);
  elip(c, X_CHARCO, 66, 11, 3.5, '#6fc3e8');

  // Mamá pata al otro lado del charco; grazna cuando llega un patito
  const cuac = v.notas.some((n) => n.pulso - v.pulso > 0.6 && n.pulso - v.pulso < 1);
  pata(c, 140, 62, 1.2, '#ffffff');
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
    const x = X_CHARCO - falta * AVANCE - 6;
    if (falta > 0) {
      pata(c, x, 64, 0.6, color);
    } else if (n.juicio === 'perfect' || n.juicio === 'great') {
      // Salta por encima del charco y sigue hacia mamá pata
      const salto = Math.max(0, Math.sin(Math.min(1, -falta / 0.6) * Math.PI)) * 9;
      pata(c, x, 64 - salto, 0.6, color);
    } else {
      // Ha caído al charco: chapoteo
      pata(c, X_CHARCO - 4, 66, 0.6, color);
      for (let g = 0; g < 4; g++)
        circ(c, X_CHARCO - 8 + g * 5, 60 - (g % 2) * 3 + falta * 2, 0.9, '#6fc3e8', false);
    }
  }
};

export const patitos: Escenario = {
  dibujar,
  instrucciones:
    'Mamá pata hace cuac y sus patitos llegan al charco. Pulsa J justo cuando un patito llega para que salte. Si vienen dos seguidos, el segundo (más clarito) salta con K.',
  aviso: (m, t, tecla) => {
    // Cuac de mamá pata: grave si es un patito, más agudo si es el segundo de una pareja
    const o = m.tono('sawtooth', tecla === 'accion' ? 330 : 440, t, 0.14, 0.05);
    o.frequency.exponentialRampToValueAtTime(tecla === 'accion' ? 220 : 300, t + 0.14);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Todos los patitos secos y felices!'
      : hype >= 40
        ? 'Algún patito mojado, pero bien'
        : 'Mamá pata tendrá que secar a todos',
};
