/**
 * Escenario fácil: Puerto de las gaviotas.
 * Una gaviota grazna, vuela hacia el poste y se posa en él un pulso después:
 * justo entonces el pescador le lanza una sardina.
 */
import { ANCHO, caja, circ, elip, fondo, golpeDeComic, persona, poli, raya, TINTA } from './dibujo';
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

function barco(c: CanvasRenderingContext2D, x: number, y: number): void {
  poli(c, [x - 9, y, x + 9, y, x + 6, y + 4, x - 6, y + 4], '#e8505b');
  raya(c, [x, y, x, y - 13], 1);
  poli(c, [x + 0.6, y - 12, x + 8, y - 2, x + 0.6, y - 2], '#ffffff');
  poli(c, [x - 0.6, y - 9, x - 6, y - 2, x - 0.6, y - 2], '#ffe9c2');
}

function decorado(c: CanvasRenderingContext2D, t: number): void {
  // Atardecer en franjas, sol con reflejo y nubes que se mueven despacio
  fondo(c, '#ffd9a0');
  fondo(c, '#ffc28f', 0, 18, ANCHO, 14);
  fondo(c, '#ffa98a', 0, 32, ANCHO, 18);
  circ(c, 112, 38, 12, '#fff1b8');
  const nube = (t * 1.5) % (ANCHO + 40);
  elip(c, nube - 20, 14, 12, 4, '#ffffff');
  elip(c, nube - 10, 11, 8, 4, '#ffffff');
  elip(c, ((nube + 90) % (ANCHO + 40)) - 20, 22, 9, 3, '#fff4e6');
  // Gaviotas lejanas
  for (let i = 0; i < 3; i++) {
    const gx = 40 + i * 14 + Math.sin(t + i) * 2;
    const gy = 10 + (i % 2) * 4;
    raya(c, [gx - 2.4, gy, gx, gy + 1.2, gx + 2.4, gy], 0.7);
  }
  // Mar con el reflejo del sol y olas que avanzan
  fondo(c, '#3d9ad3', 0, 50, ANCHO, 40);
  fondo(c, '#56b1e3', 0, 50, ANCHO, 6);
  raya(c, [0, 50, ANCHO, 50]);
  for (let k = 0; k < 4; k++)
    caja(c, 104 - k * 2, 53 + k * 4, 16 + k * 4, 1.4, '#ffe9a8', 0.7, false);
  barco(c, 94 + ((t * 1.2) % 12), 47);
  for (let i = 0; i < 7; i++) {
    const x = ((i * 27 + t * 8) % (ANCHO + 20)) - 10;
    const y = 62 + (i % 3) * 9;
    raya(c, [x, y, x + 4, y - 2, x + 8, y], 1, '#ffffff');
  }
  // Faro sobre las rocas, con la luz que gira
  elip(c, 142, 53, 14, 4, '#7d7f8c');
  elip(c, 134, 52, 6, 3, '#9a9cab');
  poli(c, [134, 52, 137, 16, 147, 16, 150, 52], '#ffffff');
  poli(c, [135.2, 40, 136.1, 30, 147.9, 30, 148.8, 40], '#e8505b');
  caja(c, 140, 44, 4, 8, '#3a6ea5', 1);
  const luz = Math.sin(t * 2) > 0;
  if (luz) poli(c, [142, 13, 112, 6, 112, 20], 'rgba(255, 240, 160, 0.45)', false);
  caja(c, 135, 9, 14, 8, luz ? '#ffe66d' : '#f2c14e', 1);
  poli(c, [133, 9, 142, 3, 151, 9], '#e8505b');
  // Muelle de tablas, poste con cuerda y cubo de sardinas
  for (let x = 6; x < 96; x += 18) caja(c, x, 64, 5, 26, '#8a5a36', 0.5);
  caja(c, -2, 59, 98, 6, '#b07a4a', 1);
  for (let x = 10; x < 96; x += 12) raya(c, [x, 59.6, x, 64.4], 0.6, '#8a5a36');
  caja(c, 72, 45, 8, 15, '#8a5a36', 1);
  caja(c, 70.5, 43.5, 11, 3, '#b07a4a', 1);
  raya(c, [72, 52, 76, 54, 80, 52], 1.2, '#e9d6a8');
  poli(c, [16, 51, 28, 51, 26.5, 59, 17.5, 59], '#5aa0c8');
  raya(c, [16.5, 53, 27.6, 53], 0.6, '#3d7ea6');
  elip(c, 20, 50.5, 3, 1.2, '#c9d3de', 0.4);
  elip(c, 24, 50.5, 3, 1.2, '#c9d3de', -0.3);
  // Salvavidas colgado del muelle
  circ(c, 58, 69, 4, '#ffffff');
  circ(c, 58, 69, 1.8, '#3d9ad3');
  for (const a of [0.8, 2.4, 3.9, 5.5])
    raya(
      c,
      [58 + Math.cos(a) * 2, 69 + Math.sin(a) * 2, 58 + Math.cos(a) * 4, 69 + Math.sin(a) * 4],
      1.4,
      '#e8505b',
    );
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
    contento: lanzando,
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
  golpeDeComic(c, v, 92, 24, ['¡ÑAM!', '¡HOP!', '¡ZAS!']);
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
