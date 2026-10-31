/**
 * Escenario difícil: Estrellas fugaces.
 * Las estrellas cruzan el cielo a distintas velocidades y hay que
 * fotografiarlas (J) cuando pasan por la mira. Los cometas grandes, con K.
 */
import { ANCHO, caja, circ, estrella, fondo, persona, poli, raya } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const MIRA_X = 80;
const MIRA_Y = 30;
/** Pulsos que tarda cada estrella en llegar a la mira: unas van rápidas y otras lentas. */
const VELOCIDADES = [1.2, 0.8, 1.6, 1];

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#23295e');
  for (let i = 0; i < 26; i++) {
    const x = (i * 37) % ANCHO;
    const y = (i * 53) % 58;
    if (i % 4) circ(c, x, y, 0.6, '#c8ceff', false);
    else estrella(c, x, y, 1.6, '#fff4b3');
  }
  circ(c, 24, 18, 8, '#fff1b8');
  circ(c, 28, 15, 7, '#23295e', false);

  // Flash de la cámara justo después de pulsar
  if (v.desdePulsacion < 0.08) fondo(c, 'rgba(255,255,255,0.35)');

  v.notas.forEach((n, i) => {
    const cometa = v.teclas[i] === 'alterna';
    const viaje = cometa ? 2 : VELOCIDADES[i % VELOCIDADES.length];
    const k = 1 - (n.pulso - v.pulso) / viaje; // 0 al aparecer, 1 en la mira
    const acierto = n.juicio === 'perfect' || n.juicio === 'great';
    if (k < 0 || k > 2.2) return;
    if (acierto && k > 1) {
      // Fotografiada: se queda brillando en la mira un momento
      if (k < 1.4) estrella(c, MIRA_X, MIRA_Y, (cometa ? 6 : 4) * (1.4 - k) * 2.5, '#ffffff');
      return;
    }
    // Cada estrella entra por un lado distinto y cruza la mira en línea recta
    const desdeArriba = i % 2 === 0;
    const ox = desdeArriba ? MIRA_X - 70 : MIRA_X + 75;
    const oy = desdeArriba ? MIRA_Y - 26 : MIRA_Y - 20;
    const x = ox + (MIRA_X - ox) * k;
    const y = oy + (MIRA_Y - oy) * k;
    const dx = (MIRA_X - ox) / 70;
    const dy = (MIRA_Y - oy) / 70;
    const estela = cometa ? 26 : 16;
    raya(
      c,
      [x - dx * estela, y - dy * estela, x, y],
      cometa ? 3.4 : 2.2,
      cometa ? '#ff9e6b' : '#ffe07a',
    );
    estrella(c, x, y, cometa ? 5 : 3.4, cometa ? '#ff9e6b' : '#ffe07a');
  });

  // Mira del telescopio
  c.beginPath();
  c.arc(MIRA_X, MIRA_Y, 7, 0, Math.PI * 2);
  c.stroke();
  raya(c, [MIRA_X, MIRA_Y - 10, MIRA_X, MIRA_Y + 10], 1, '#7cf2c0');
  raya(c, [MIRA_X - 10, MIRA_Y, MIRA_X + 10, MIRA_Y], 1, '#7cf2c0');

  // Suelo, cúpula y astrónoma
  fondo(c, '#3a3f7a', 0, 66, ANCHO, 24);
  raya(c, [0, 66, ANCHO, 66]);
  c.beginPath();
  c.arc(118, 66, 22, Math.PI, 0);
  c.closePath();
  c.fillStyle = '#dfe3f0';
  c.fill();
  c.stroke();
  poli(c, [114, 44.5, 122, 44.5, 122, 66, 114, 66], '#3a3f7a');
  poli(c, [106, 48, 132, 34, 135, 39, 109, 53], '#9aa3c7');
  persona(c, 44, 66, {
    ropa: '#7b5fd1',
    piel: '#9a5f3c',
    pelo: '#2a2230',
    brazo: v.desdePulsacion < 0.15 ? 2.4 : 0.6,
  });
  caja(c, 48, 44, 6, 4, '#2a2230', 1);
};

export const observatorio: Escenario = {
  dibujar,
  instrucciones:
    'Las estrellas cruzan el cielo a distintas velocidades. Pulsa J para fotografiar cada una cuando pasa por la mira. Los cometas grandes y naranjas se fotografían con K.',
  aviso: (m, t, tecla) => {
    // Destello que sube: más grave y largo si es un cometa
    const o = m.tono(
      'sine',
      tecla === 'alterna' ? 600 : 1800,
      t,
      tecla === 'alterna' ? 0.4 : 0.12,
      0.05,
    );
    o.frequency.exponentialRampToValueAtTime(tecla === 'alterna' ? 1200 : 2600, t + 0.12);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Fotos para la portada de la revista!'
      : hype >= 40
        ? 'Un buen álbum de estrellas'
        : 'Todas las fotos han salido movidas',
};
