/**
 * Escenario difícil: Estrellas fugaces.
 * Todas las estrellas recorren el mismo camino a la misma velocidad, así la
 * distancia entre ellas es el ritmo que viene. Se fotografían con J cuando
 * pasan por la mira; los cometas grandes, con K.
 */
import { ANCHO, caja, circ, estrella, fondo, persona, poli, raya } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const MIRA_X = 80;
const MIRA_Y = 30;
const ORIGEN_X = -6;
const ORIGEN_Y = 16; // por debajo de la barra de Hype, que tapa la esquina
/** Pulsos que tarda cualquier estrella en llegar a la mira: da tiempo a contarlas. */
const VIAJE = 4;

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#23295e');
  for (let i = 0; i < 26; i++) circ(c, (i * 37) % ANCHO, (i * 53) % 58, 0.6, '#c8ceff', false);
  circ(c, 136, 14, 8, '#fff1b8');
  circ(c, 140, 11, 7, '#23295e', false);

  // Flash de la cámara justo después de pulsar
  if (v.desdePulsacion < 0.08) fondo(c, 'rgba(255,255,255,0.35)');

  // Camino por el que llegan las estrellas
  raya(c, [ORIGEN_X, ORIGEN_Y, MIRA_X, MIRA_Y], 1, '#4a5296');

  v.notas.forEach((n, i) => {
    const cometa = v.teclas[i] === 'alterna';
    const k = 1 - (n.pulso - v.pulso) / VIAJE; // 0 al aparecer, 1 en la mira
    const acierto = n.juicio === 'perfect' || n.juicio === 'great';
    if (k < 0 || k > 1.4) return;
    if (acierto && k > 1) {
      // Fotografiada: se queda brillando en la mira un momento
      estrella(c, MIRA_X, MIRA_Y, (cometa ? 6 : 4) * (1.4 - k) * 2.5, '#ffffff');
      return;
    }
    const x = ORIGEN_X + (MIRA_X - ORIGEN_X) * k;
    const y = ORIGEN_Y + (MIRA_Y - ORIGEN_Y) * k;
    estrella(c, x, y, cometa ? 6.5 : 4, cometa ? '#ff9e6b' : '#ffe07a');
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
    'Las estrellas llegan en fila desde la izquierda, todas a la misma velocidad: cuanto más juntas vienen, más seguido tendrás que pulsar. Pulsa J cuando cada una llega a la mira. Los cometas grandes y naranjas se fotografían con K.',
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
