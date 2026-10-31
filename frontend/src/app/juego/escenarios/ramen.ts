/**
 * Escenario medio: Ramen a contratiempo.
 * El chef corta cebolleta en el pulso (J) y la echa a la olla en el
 * contratiempo (K). La tapa de la olla se levanta cuando toca echarla.
 */
import { ANCHO, caja, circ, elip, fondo, persona, poli, raya } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  fondo(c, '#fff0d6');
  // Farolillos que se balancean
  for (let i = 0; i < 4; i++) {
    const y = 8 + Math.sin(t * 2 + i) * 1;
    raya(c, [20 + i * 40, 0, 20 + i * 40, y + 1]);
    elip(c, 20 + i * 40, y + 10, 7, 9, '#e8505b');
    raya(c, [14 + i * 40, y + 10, 26 + i * 40, y + 10], 0.8);
  }
  caja(c, -2, 58, ANCHO + 4, 34, '#c98a55', 0.5);

  // Cuántos cortes lleva desde la última vez que echó la cebolleta a la olla
  let trozos = 0;
  let cortes = 0;
  let ultimaOlla = -Infinity;
  v.notas.forEach((n, i) => {
    if (n.juicio === null || n.juicio === 'miss') return;
    if (v.teclas[i] === 'accion') {
      trozos++;
      cortes++;
    } else {
      trozos = 0;
      ultimaOlla = n.pulso;
    }
  });

  // Olla con vapor; la tapa se levanta si viene una nota de K
  const vieneK = v.notas.some(
    (n, i) => v.teclas[i] === 'alterna' && n.pulso - v.pulso > 0 && n.pulso - v.pulso < 1,
  );
  caja(c, 102, 40, 36, 19, '#7d8796', 3);
  c.save();
  c.translate(120, 39);
  c.rotate(vieneK ? -0.35 : 0);
  caja(c, vieneK ? -12 : -21, vieneK ? -6 : -2, 42, 4, '#a3acba', 2);
  c.restore();
  for (let i = 0; i < 3; i++) {
    const y = 32 - ((t * 10 + i * 4) % 12);
    elip(c, 110 + i * 10, y, 3, 2.4, '#ffffff');
  }
  // Trozos volando a la olla justo después de echarlos
  const vuelo = v.pulso - ultimaOlla;
  if (vuelo >= 0 && vuelo < 0.5) {
    const k = vuelo / 0.5;
    for (let i = 0; i < 4; i++)
      circ(c, 50 + k * 66 + i * 3, 46 - Math.sin(k * Math.PI) * 16 + i, 1.2, '#b6e37a');
  }

  // Tabla, cebolleta (se acorta con cada corte) y los trozos ya cortados
  caja(c, 26, 53, 56, 6, '#f2cf8c', 2);
  const largo = 44 - (cortes % 8) * 4;
  caja(c, 76 - largo, 50.5, largo, 3, '#4dbb5f', 1.5);
  for (let i = 0; i < Math.min(trozos, 8); i++) circ(c, 30 + i * 3.4, 47, 1.2, '#b6e37a');

  persona(c, 62, 49, {
    ropa: '#ffffff',
    piel: '#f2c19a',
    mira: -1,
    brazo: 0.9,
    gorro: (g, x, y) => {
      caja(g, x - 6, y - 10, 12, 5, '#ffffff', 1);
      elip(g, x, y - 13, 7, 4.5, '#ffffff');
    },
  });
  // Cuchillo: baja al pulsar
  const baja = v.desdePulsacion < 0.12 ? 1 - v.desdePulsacion / 0.12 : 0;
  const xk = 76 - largo - 2;
  const yk = 36 + baja * 11;
  poli(c, [xk, yk, xk + 2.5, yk, xk + 2.5, yk + 8, xk, yk + 10], '#e6ebf2');
  caja(c, xk - 0.2, yk - 5, 3, 5, '#5b3a29', 1);
};

export const ramen: Escenario = {
  dibujar,
  instrucciones:
    'El chef corta cebolleta en cada pulso: pulsa J para cortar. Cuando la tapa de la olla se levanta, pulsa K en el contratiempo para echarla dentro.',
  aviso: (m, t, tecla) => {
    // Corte: golpe seco de madera. Olla: burbuja que sube
    if (tecla === 'accion') m.tono('square', 1500, t, 0.03, 0.04);
    else {
      const o = m.tono('sine', 300, t, 0.15, 0.12);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    }
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Cola en la puerta del restaurante!'
      : hype >= 40
        ? 'Un ramen bastante rico'
        : 'La sopa se ha quedado sin cebolleta',
};
