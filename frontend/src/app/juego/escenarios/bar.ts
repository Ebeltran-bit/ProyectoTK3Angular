/**
 * Escenario fácil: Brindis arcade.
 * Dos clientes deslizan sus jarras por la barra y chocan en el centro al
 * golpe de batería. Jarra rubia: J. Jarras dobles de tostada: K.
 */
import { ANCHO, caja, elip, fondo, persona, raya } from './dibujo';
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
  fondo(c, '#7a3b52');
  for (let x = 0; x < ANCHO; x += 20) fondo(c, '#6c3348', x, 0, 10, 50);
  caja(c, -2, 24, ANCHO + 4, 3.5, '#b5763f', 0.5);
  const colores = ['#3fae6a', '#d9733b', '#4b8fd6', '#e8c547'];
  for (let i = 0; i < 9; i++) {
    caja(c, 10 + i * 16, 12, 6, 12, colores[i % 4], 1.5);
    caja(c, 11.5 + i * 16, 8, 3, 4.5, '#f2f2f2', 0.8);
  }
  // Rótulo de neón: se enciende fuerte en cada pulso
  caja(c, 54, 31, 52, 13, '#2a1420', 3);
  c.save();
  c.lineWidth = 1.2;
  c.strokeStyle = pulso % 1 < 0.25 ? '#ff6fb5' : '#b0457e';
  c.font = '700 9px system-ui, sans-serif';
  c.textAlign = 'center';
  c.strokeText('BRINDIS', 80, 40.5);
  c.restore();
  // Barra
  caja(c, -2, 60, ANCHO + 4, 7, '#d58a4c', 0.5);
  fondo(c, '#9c5f34', 0, 67.6, ANCHO, 23);
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
  });
  persona(c, 148, 64, {
    ropa: '#3fae6a',
    piel: '#9a5f3c',
    pelo: '#f0e6d6',
    mira: -1,
    brazo: empujando ? 1.7 : 1.2,
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
