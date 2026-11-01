/**
 * Escenario fácil: Brindis arcade.
 * Dos clientes deslizan sus jarras por la barra y chocan en el centro al
 * golpe de batería. Jarra rubia: J. Jarras dobles de tostada: K.
 */
import { ANCHO, caja, elip, fondo, golpeDeComic, persona, raya } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const RUBIA = '#ffc93c';
const TOSTADA = '#c46a2b';

function jarra(
  c: CanvasRenderingContext2D,
  x: number,
  color: string,
  mira: number,
  inclinada = 0,
): void {
  c.save();
  c.translate(x + 4.5, 60);
  c.rotate(inclinada);
  caja(c, -4.5, -10.5, 9, 10.5, color, 1.5);
  caja(c, -5, -13, 10, 3.5, '#ffffff', 2);
  c.beginPath();
  const asa = mira > 0 ? -4.5 : 4.5;
  c.arc(
    asa,
    -5.5,
    2.6,
    mira > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
    mira > 0 ? Math.PI * 1.5 : Math.PI * 0.5,
  );
  c.stroke();
  c.restore();
}

function decorado(c: CanvasRenderingContext2D, pulso: number): void {
  // Pared de madera con lámparas que se balancean un poco al compás
  fondo(c, '#7a3b52');
  for (let x = 0; x < ANCHO; x += 20) fondo(c, '#6c3348', x, 0, 10, 50);
  fondo(c, '#5a2a3c', 0, 46, ANCHO, 14);
  raya(c, [0, 46, ANCHO, 46], 0.8);
  // Estantería con botellas de formas distintas
  caja(c, -2, 24, ANCHO + 4, 3.5, '#b5763f', 0.5);
  const colores = ['#3fae6a', '#d9733b', '#4b8fd6', '#e8c547', '#c2364f'];
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 16;
    const alta = i % 3 === 0;
    caja(c, x, alta ? 9 : 13, 6, alta ? 15 : 11, colores[i % 5], 1.5);
    caja(c, x + 1.5, alta ? 5 : 9, 3, 4.5, colores[i % 5], 0.8);
    caja(c, x + 1, alta ? 14 : 17, 4, 3.5, '#fdf3dc', 0.5);
  }
  // Rótulo de neón: se enciende fuerte en cada pulso
  caja(c, 54, 31, 52, 13, '#2a1420', 3);
  c.save();
  c.lineWidth = 1.2;
  c.strokeStyle = pulso % 1 < 0.25 ? '#ff6fb5' : '#b0457e';
  c.font = '900 9px "Arial Black", system-ui, sans-serif';
  c.textAlign = 'center';
  c.strokeText('BRINDIS', 80, 40.5);
  c.restore();
  // Barra con grifos de cerveza y posavasos
  caja(c, -2, 60, ANCHO + 4, 7, '#d58a4c', 0.5);
  raya(c, [0, 61.6, ANCHO, 61.6], 0.6, '#f0b07a');
  for (const gx of [40, 120]) {
    caja(c, gx - 1.5, 50, 3, 10, '#c9d3de', 1);
    caja(c, gx - 4, 48, 8, 2.6, '#c9d3de', 1);
    caja(c, gx - 1.2, 44, 2.4, 4, '#e8505b', 1);
  }
  fondo(c, '#9c5f34', 0, 67.6, ANCHO, 23);
  for (let x = 0; x < ANCHO; x += 20) raya(c, [x, 67.6, x, 90], 0.6, '#7d4a28');
  raya(c, [0, 67.6, ANCHO, 67.6]);
}

const dibujar: DibujarEscena = (c, v) => {
  decorado(c, v.pulso);
  // Los clientes estiran el brazo mientras empujan su jarra
  const empujando = v.notas.some((n) => n.pulso - v.pulso > 0 && n.pulso - v.pulso < 1);
  persona(c, 12, 64, {
    ropa: '#e8505b',
    piel: '#f2c19a',
    pelo: '#2a2230',
    mira: 1,
    brazo: empujando ? 1.7 : 1.2,
    contento: v.desdePulsacion < 0.4,
  });
  persona(c, 148, 64, {
    ropa: '#3fae6a',
    piel: '#9a5f3c',
    pelo: '#f0e6d6',
    mira: -1,
    brazo: empujando ? 1.7 : 1.2,
    contento: v.desdePulsacion < 0.4,
  });

  for (const [i, n] of v.notas.entries()) {
    const falta = n.pulso - v.pulso;
    if (falta > 1 || falta < -0.8) continue;
    const doble = v.teclas[i] === 'alterna';
    const color = doble ? TOSTADA : RUBIA;
    if (falta > 0) {
      // Se deslizan desde los clientes hasta el centro
      const d = falta * 52;
      if (doble) {
        jarra(c, 62 - d, color, 1);
        jarra(c, 89 + d, color, -1);
      }
      jarra(c, 70 - d, color, 1);
      jarra(c, 81 + d, color, -1);
    } else if (n.juicio === 'perfect' || n.juicio === 'great') {
      // ¡Chin! Espuma que salta
      jarra(c, 70, color, 1, -0.15);
      jarra(c, 81, color, -1, 0.15);
      const k = -falta / 0.8;
      for (let r = 0; r < 6; r++) {
        const a = Math.PI + r * 0.63;
        const largo = 6 + k * 14;
        raya(
          c,
          [
            80 + Math.cos(a) * largo * 0.6,
            47 + Math.sin(a) * largo * 0.6,
            80 + Math.cos(a) * largo,
            47 + Math.sin(a) * largo,
          ],
          1.2,
          '#ffffff',
        );
      }
    } else if (n.juicio === 'miss') {
      // Las jarras se cruzan sin chocar y se derrama la cerveza
      elip(c, 80, 61, 10 + -falta * 6, 1.6, color, 0, false);
      jarra(c, 66, color, 1, -0.5);
      jarra(c, 85, color, -1, 0.5);
    }
  }
  golpeDeComic(c, v, 80, 20, ['¡CHIN!', '¡CLINC!', '¡SALUD!']);
};

export const bar: Escenario = {
  dibujar,
  instrucciones:
    'Los clientes deslizan sus jarras por la barra. Pulsa J cuando las jarras rubias chocan en el centro, y K cuando llegan las jarras dobles de tostada.',
  aviso: (m, t, tecla) => {
    // Jarra que se desliza por la madera: un ruido grave que dura el pulso del aviso
    m.ruido(t, 0.35, tecla === 'alterna' ? 0.1 : 0.07, 'lowpass', tecla === 'alterna' ? 500 : 900);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Ronda gratis para todo el bar!'
      : hype >= 40
        ? 'Buen brindis'
        : 'Hay que fregar la barra',
};
