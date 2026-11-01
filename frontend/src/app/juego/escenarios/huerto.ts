/**
 * Escenario fácil: Huerto a compás.
 * Una abeja vuela hasta la calabaza que toca regar; la hortelana la riega
 * en su pulso y cada acierto la hace crecer un poco.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  fondo,
  onomatopeya,
  persona,
  poli,
  raya,
  TINTA,
  ultimoGolpe,
} from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const CALABAZAS = 5;
const xCalabaza = (i: number) => 18 + (i % CALABAZAS) * 31;

function calabaza(c: CanvasRenderingContext2D, x: number, tam: number): void {
  elip(c, x, 70.4, tam * 1.8, 1.4, 'rgba(20, 16, 25, 0.2)', 0, false);
  elip(c, x, 70 - tam * 0.8, tam * 1.6, tam, '#f08a24');
  // Gajos de la calabaza
  elip(c, x, 70 - tam * 0.8, tam * 0.7, tam, '#f7a23e');
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
  // Cielo, sol con rayos que giran y nubes
  fondo(c, '#9fd8f2');
  fondo(c, '#b9e4f6', 0, 30, ANCHO, 22);
  for (let i = 0; i < 8; i++) {
    const a = t * 0.4 + (i * Math.PI) / 4;
    raya(
      c,
      [24 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, 24 + Math.cos(a) * 15, 16 + Math.sin(a) * 15],
      1.2,
      '#ffd23f',
    );
  }
  circ(c, 24, 16, 9, '#ffe066');
  elip(c, 110 + Math.sin(t / 4) * 4, 14, 14, 5, '#ffffff');
  elip(c, 122 + Math.sin(t / 4) * 4, 11, 9, 5, '#ffffff');
  // Colinas, granero y árbol al fondo
  elip(c, 40, 52, 70, 12, '#7cc56a');
  elip(c, 130, 54, 60, 11, '#6ab85a');
  caja(c, 128, 30, 18, 16, '#c2364f', 0.5);
  poli(c, [126, 31, 137, 22, 148, 31], '#8a2a3c');
  caja(c, 134, 37, 6, 9, '#fdf3dc', 0.5);
  raya(c, [134, 37, 140, 46], 0.6);
  raya(c, [140, 37, 134, 46], 0.6);
  caja(c, 62, 34, 3, 14, '#8a5a36', 1);
  circ(c, 63.5, 30, 7, '#4fa64a');
  circ(c, 58.5, 33, 4.5, '#5cb856');
  circ(c, 66, 26, 1, '#e8505b', false);
  circ(c, 60, 30, 1, '#e8505b', false);
  // Valla de madera
  for (let x = 2; x < ANCHO; x += 9) caja(c, x, 44, 3, 10, '#e9d6a8', 0.8);
  raya(c, [0, 47, ANCHO, 47], 1.4, '#e9d6a8');
  raya(c, [0, 47, ANCHO, 47], 0.4);
  // Tierra con surcos y flores
  caja(c, -2, 54, ANCHO + 4, 38, '#a86a3d', 0.5);
  for (let x = 4; x < ANCHO; x += 14) raya(c, [x, 58, x + 8, 58], 1, '#8a542e');
  for (let x = 6; x < ANCHO; x += 22) {
    raya(c, [x, 86, x, 81], 0.6, '#3f8f3a');
    circ(c, x, 80.5, 1.4, x % 44 === 6 ? '#ff8fa3' : '#ffffff');
  }

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
    contento: regando,
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

  // Onomatopeya sobre la calabaza que se acaba de regar
  const golpe = ultimoGolpe(v);
  if (golpe) {
    const gx = Math.min(140, Math.max(20, xCalabaza(golpe.indice)));
    if (golpe.acierto)
      onomatopeya(c, gx + 12, 16, ['¡CHOF!', '¡GLUP!', '¡PLIC!'][golpe.indice % 3], golpe.k);
    else onomatopeya(c, gx + 12, 16, '¡UY!', golpe.k, '#ff6b6b');
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
