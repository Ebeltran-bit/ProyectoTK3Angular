/**
 * Escenario fácil: Puerto de las gaviotas.
 * Una gaviota grazna, vuela hacia el poste y se posa en él un pulso después:
 * justo entonces el pescador le lanza una sardina.
 */
import { ANCHO, caja, circ, elip, fondo, persona, poli, raya, TINTA } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

function gaviota(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  alaArriba: boolean,
  triste = false,
): void {
  elip(c, x, y, 6, 3.6, '#ffffff');
  poli(c, [x - 5, y - 1, x - 10, y - 3, x - 9, y + 2], '#ffffff');
  circ(c, x + 5, y - 3.5, 3.2, '#ffffff');
  poli(c, [x + 7.6, y - 4.4, x + 11.5, y - 3.2, x + 7.6, y - 2.2], '#ffb000');
  circ(c, x + 5.6, y - 4.4, 0.7, TINTA, false);
  if (triste) raya(c, [x + 4, y - 6.8, x + 6.6, y - 6.2]);
  elip(c, x - 1, y + (alaArriba ? -5 : 0.5), 4.8, 2.2, '#d7dce6', alaArriba ? -0.5 : 0.25);
  raya(c, [x - 1, y + 3.4, x - 1, y + 6]);
  raya(c, [x + 2, y + 3.4, x + 2, y + 6]);
}

function sardina(c: CanvasRenderingContext2D, x: number, y: number, giro = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(giro);
  elip(c, 0, 0, 3.6, 1.4, '#c9d3de');
  poli(c, [-3.2, 0, -5.6, -1.6, -5.6, 1.6], '#c9d3de');
  c.restore();
}

function decorado(c: CanvasRenderingContext2D, t: number): void {
  fondo(c, '#ffd29a');
  fondo(c, '#ffb48a', 0, 30, ANCHO, 22);
  circ(c, 112, 34, 12, '#fff1b8');
  elip(c, 70, 14, 12, 4, '#ffffff');
  elip(c, 80, 11, 8, 4, '#ffffff');
  // Mar con olas que avanzan
  fondo(c, '#4aa6d9', 0, 50, ANCHO, 40);
  raya(c, [0, 50, ANCHO, 50]);
  for (let i = 0; i < 7; i++) {
    const x = ((i * 27 + t * 8) % (ANCHO + 20)) - 10;
    const y = 60 + (i % 3) * 9;
    raya(c, [x, y, x + 4, y - 2, x + 8, y], 1, '#ffffff');
  }
  // Faro con la luz que parpadea
  poli(c, [134, 52, 137, 16, 147, 16, 150, 52], '#ffffff');
  poli(c, [135.2, 40, 136.1, 30, 147.9, 30, 148.8, 40], '#e8505b');
  caja(c, 135, 9, 14, 8, Math.sin(t * 2) > 0 ? '#ffe66d' : '#f2c14e', 1);
  poli(c, [133, 9, 142, 3, 151, 9], '#e8505b');
  // Muelle, poste y cubo de sardinas
  for (let x = 6; x < 96; x += 18) caja(c, x, 64, 5, 26, '#8a5a36', 0.5);
  caja(c, -2, 59, 98, 6, '#b07a4a', 1);
  caja(c, 72, 45, 8, 15, '#8a5a36', 1);
  caja(c, 70.5, 43.5, 11, 3, '#b07a4a', 1);
  poli(c, [16, 51, 28, 51, 26.5, 59, 17.5, 59], '#5aa0c8');
  elip(c, 20, 50.5, 3, 1.2, '#c9d3de', 0.4);
  elip(c, 24, 50.5, 3, 1.2, '#c9d3de', -0.3);
}

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  decorado(c, t);
  const lanzando = v.desdePulsacion < 0.15;
  persona(c, 38, 59, {
    ropa: '#3a7bd5',
    piel: '#f2c19a',
    pelo: '#6b3e26',
    brazo: lanzando ? 2.3 : 0.3,
    gorro: (g, x, y) => {
      caja(g, x - 9, y - 6, 18, 3, '#ffc93c', 1.5);
      caja(g, x - 5.5, y - 11, 11, 6, '#ffc93c', 3);
    },
  });

  // Cada gaviota vuela hacia el poste durante el pulso y medio anterior a su nota
  const aleteo = Math.floor(t * 10) % 2 === 0;
  for (const n of v.notas) {
    const falta = n.pulso - v.pulso;
    if (falta > 1.6 || falta < -1.5) continue;
    if (falta > 0) {
      const k = 1 - falta / 1.6;
      gaviota(c, 168 - k * 92, 38 - Math.sin(k * Math.PI) * 16 + 2 * k, aleteo);
    } else if (n.juicio === 'perfect' || n.juicio === 'great') {
      // Se va contenta con su sardina
      const k = -falta / 1.5;
      gaviota(c, 76 + k * 90, 40 - k * 40, aleteo);
      sardina(c, 88 + k * 90, 37 - k * 40, 0.3);
    } else {
      gaviota(c, 76, 40, false, n.juicio === 'miss');
    }
  }

  // Sardina en el aire justo después de pulsar
  if (v.desdePulsacion < 0.18) {
    const k = v.desdePulsacion / 0.18;
    sardina(c, 46 + k * 32, 40 - Math.sin(k * Math.PI) * 10, k * 6);
  }
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
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡El puerto entero aplaude!'
      : hype >= 40
        ? 'Las gaviotas están contentas'
        : 'Las gaviotas se han ido a otro muelle',
};
