/**
 * Escenario medio: Correos exprés.
 * Las cartas avanzan por la cinta y hay que sellar cada una justo cuando
 * pasa bajo el sello (J). Las urgentes, en rojo, llegan a contratiempo.
 */
import { ANCHO, caja, circ, fondo, persona, poli, raya } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const X_SELLO = 90.5;
const AVANCE = 26; // unidades que avanza la cinta en un pulso

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#e3ecf5');
  for (let x = 0; x < ANCHO; x += 16)
    poli(c, [x, 0, x + 16, 0, x + 16, 8, x + 8, 12, x, 8], x % 32 ? '#ffffff' : '#e8505b');
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 2; j++) caja(c, 6 + i * 13, 18 + j * 11, 11, 9, '#c8d6e5', 1);
  // La cartera está detrás de la cinta
  persona(c, 122, 57, {
    ropa: '#2f5fbf',
    piel: '#fde0c5',
    pelo: '#e3b65a',
    mira: -1,
    brazo: v.desdePulsacion < 0.12 ? 2 : 1.6,
    gorro: (g, x, y) => {
      caja(g, x - 8, y - 9, 16, 5, '#2f5fbf', 2);
      caja(g, x - 10, y - 5, 9, 2, '#1d3f85', 1);
    },
  });
  // Cinta: los rodillos giran al ritmo de las cartas
  caja(c, -2, 57, ANCHO + 4, 7, '#4d5266', 1);
  const desplazamiento = (v.pulso * AVANCE) % 10;
  for (let x = -10; x < ANCHO + 10; x += 10) circ(c, x + desplazamiento, 60.5, 2, '#6e7590');
  fondo(c, '#cdd9e6', 0, 64.6, ANCHO, 26);
  raya(c, [0, 64.6, ANCHO, 64.6]);

  // Cartas: cada nota es una carta que pasa bajo el sello en su pulso
  v.notas.forEach((n) => {
    const x = X_SELLO + (v.pulso - n.pulso) * AVANCE - 10.5;
    if (x < -24 || x > ANCHO + 4) return;
    const urgente = n.pulso % 1 !== 0;
    caja(c, x, 46, 21, 11, urgente ? '#ffd6dc' : '#ffffff', 1);
    raya(c, [x, 46, x + 10.5, 52, x + 21, 46], 0.8);
    if (n.juicio === 'perfect' || n.juicio === 'great') {
      caja(c, x + 14, 47.5, 5, 5, '#e8505b', 0.6);
    } else if (n.juicio === 'miss') {
      raya(c, [x + 14, 47.5, x + 19, 52.5], 1, '#7d8796');
      raya(c, [x + 19, 47.5, x + 14, 52.5], 1, '#7d8796');
    }
  });

  // Sello: baja al pulsar
  const baja = v.desdePulsacion < 0.12 ? 1 - v.desdePulsacion / 0.12 : 0;
  const ys = 22 + baja * 17;
  caja(c, X_SELLO - 6.5, ys + 11, 13, 6, '#e8505b', 1.5);
  caja(c, X_SELLO - 2, ys, 4, 11, '#8a5a36', 1);
  circ(c, X_SELLO, ys - 1.5, 3.2, '#8a5a36');
};

export const correos: Escenario = {
  dibujar,
  instrucciones:
    'Las cartas avanzan por la cinta. Pulsa J para sellar cada una justo cuando pasa bajo el sello. Las urgentes, en rojo, llegan a contratiempo.',
  aviso: (m, t) => {
    // Tic de la cinta
    m.tono('square', 2200, t, 0.02, 0.03);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Todo el correo ha salido a tiempo!'
      : hype >= 40
        ? 'Casi todas las cartas, selladas'
        : 'Mañana habrá quejas en la oficina',
};
