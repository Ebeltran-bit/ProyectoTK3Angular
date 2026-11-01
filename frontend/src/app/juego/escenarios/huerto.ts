/**
 * Escenario fácil: Huerto a compás.
 * Una abeja vuela hasta la calabaza que toca regar; la hortelana la riega
 * en su pulso y cada acierto la hace crecer un poco.
 */
import { ANCHO, caja, circ, elip, fondo, persona, poli, raya, TINTA } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const CALABAZAS = 5;
const xCalabaza = (i: number) => 18 + (i % CALABAZAS) * 31;

function calabaza(c: CanvasRenderingContext2D, x: number, tam: number): void {
  elip(c, x, 70 - tam * 0.8, tam * 1.6, tam, '#f08a24');
  raya(c, [x, 70 - tam * 1.8, x, 70], 0.8);
  caja(c, x - 0.8, 68 - tam * 2, 1.8, 3, '#3f8f3a', 0.5);
  elip(c, x + 3, 68 - tam * 2, 2.4, 1.2, '#4fb04a', 0.5);
}

function abeja(c: CanvasRenderingContext2D, x: number, y: number, ala: boolean): void {
  elip(c, x - 1, y - 2.6 - (ala ? 1 : 0), 2.4, 1.4, '#ffffff', -0.4);
  elip(c, x, y, 3.2, 2.2, '#ffd84a');
  raya(c, [x - 0.6, y - 2, x - 0.6, y + 2], 0.9);
  raya(c, [x + 1.2, y - 2, x + 1.2, y + 2], 0.9);
  circ(c, x + 2.6, y - 0.6, 0.5, TINTA, false);
}

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  fondo(c, '#9fd8f2');
  circ(c, 24, 16, 9, '#ffe066');
  elip(c, 110 + Math.sin(t / 4) * 4, 14, 14, 5, '#ffffff');
  elip(c, 122 + Math.sin(t / 4) * 4, 11, 9, 5, '#ffffff');
  elip(c, 40, 52, 70, 12, '#7cc56a');
  elip(c, 130, 54, 60, 11, '#6ab85a');
  caja(c, -2, 54, ANCHO + 4, 38, '#a86a3d', 0.5);
  for (let x = 4; x < ANCHO; x += 14) raya(c, [x, 58, x + 8, 58], 1, '#8a542e');

  // Cada calabaza crece con los aciertos que ha recibido
  const aciertos = new Array(CALABAZAS).fill(0);
  v.notas.forEach((n, i) => {
    if (n.juicio === 'perfect') aciertos[i % CALABAZAS] += 1;
    else if (n.juicio === 'great') aciertos[i % CALABAZAS] += 0.6;
  });
  for (let i = 0; i < CALABAZAS; i++) {
    calabaza(c, xCalabaza(i), Math.min(3.5 + aciertos[i] * 0.7, 9));
  }

  // La hortelana camina hacia la calabaza de la próxima nota
  const siguiente = v.notas.findIndex((n) => n.pulso - v.pulso > -0.3);
  const anterior = Math.max(0, siguiente - 1);
  let x = 74;
  if (siguiente < 0 && v.notas.length > 0) {
    // Ya no quedan notas: se queda junto a la última calabaza que regó
    x = Math.max(10, xCalabaza(v.notas.length - 1) - 14);
  } else if (siguiente >= 0) {
    const a = v.notas[anterior];
    const b = v.notas[siguiente];
    const k =
      b.pulso === a.pulso
        ? 1
        : Math.min(1, Math.max(0, ((v.pulso - a.pulso) / (b.pulso - a.pulso)) * 1.6));
    x = Math.max(10, xCalabaza(anterior) + (xCalabaza(siguiente) - xCalabaza(anterior)) * k - 14);
  }
  const regando = v.desdePulsacion < 0.25;
  persona(c, x, 54, {
    ropa: '#3fae6a',
    piel: '#fde0c5',
    pelo: '#e8505b',
    brazo: 1.5,
    gorro: (g, gx, gy) => {
      elip(g, gx, gy - 7, 11, 2.2, '#f2cf8c');
      elip(g, gx, gy - 9.5, 6, 3.4, '#f2cf8c');
    },
  });
  c.save();
  c.translate(x + 12, 38);
  c.rotate(regando ? 0.55 : 0);
  caja(c, -2, -4, 11, 8, '#5aa0c8', 2);
  poli(c, [9, -2, 15, -5, 15.5, -3.5, 9, 1], '#5aa0c8');
  c.restore();
  if (regando) {
    const k = v.desdePulsacion / 0.25;
    for (let i = 0; i < 4; i++)
      circ(c, x + 24 + i * 1.6, 44 + i * 3 + k * 8, 0.9, '#5aa0c8', false);
  }

  // La abeja vuela hasta la calabaza que toca durante el pulso anterior a la nota
  const aleteo = Math.floor(t * 14) % 2 === 0;
  for (const [i, n] of v.notas.entries()) {
    const falta = n.pulso - v.pulso;
    if (falta > 1.2 || falta < -0.6) continue;
    const destino = xCalabaza(i);
    if (falta > 0) {
      const k = 1 - falta / 1.2;
      abeja(c, 170 - (170 - destino) * k, 20 + k * 30 - Math.sin(k * Math.PI) * 10, aleteo);
    } else {
      // Se marcha: contenta hacia arriba si acertaste, mareada hacia un lado si fallaste
      const k = -falta / 0.6;
      const contenta = n.juicio === 'perfect' || n.juicio === 'great';
      abeja(c, destino + k * (contenta ? 10 : -14), 50 - k * (contenta ? 30 : 6), aleteo);
    }
  }
};

export const huerto: Escenario = {
  dibujar,
  instrucciones:
    'La abeja vuela hasta la calabaza que tiene sed. Pulsa J cuando se pose para regarla: cada acierto la hace crecer un poco.',
  aviso: (m, t) => {
    // Zumbido de la abeja
    const o = m.tono('sawtooth', 220, t, 0.3, 0.03);
    o.frequency.linearRampToValueAtTime(260, t + 0.3);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Las calabazas más grandes del pueblo!'
      : hype >= 40
        ? 'El huerto va creciendo'
        : 'Las calabazas siguen con sed',
};
