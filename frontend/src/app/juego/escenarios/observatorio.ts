/**
 * Escenario difícil: Estrellas fugaces.
 * Todas las estrellas van a la misma velocidad, así la distancia entre ellas
 * es el ritmo que viene. Se fotografían con J cuando pasan por la mira; los
 * cometas grandes, con K. Llegan por los dos lados (pruebas de Eva del
 * 05/11/2026, era demasiado fácil para un nivel difícil): en la primera mitad,
 * cada compás de un lado; en la segunda, una de cada lado por turnos.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  estrella,
  fondo,
  textoDeGolpe,
  persona,
  poli,
  raya,
} from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const MIRA_X = 80;
const MIRA_Y = 30;
const ORIGEN_Y = 16; // por debajo de la barra de Hype, que tapa las esquinas
/** Desde dónde sale una estrella: fuera de la pantalla por la izquierda o por la derecha. */
const ORIGEN_X = { izquierda: -6, derecha: ANCHO + 6 };
/** Pulso a partir del cual las estrellas se alternan una a una. */
const MITAD = 36;
/** Pulsos que tarda cualquier estrella en llegar a la mira: da tiempo a contarlas. */
const VIAJE = 4;

/**
 * Lado por el que llega cada nota. Antes de MITAD, por compases de 4 pulsos
 * (izquierda, derecha, izquierda...); después, alternando nota a nota.
 */
export function ladosDeLasEstrellas(pulsos: number[]): ('izquierda' | 'derecha')[] {
  let turno = 0;
  return pulsos.map((p) => {
    if (p < MITAD) return Math.floor(p / 4) % 2 === 0 ? 'izquierda' : 'derecha';
    return turno++ % 2 === 0 ? 'izquierda' : 'derecha';
  });
}

const dibujar: DibujarEscena = (c, v) => {
  // Cielo con franjas, vía láctea y estrellas que titilan
  fondo(c, '#1b2052');
  fondo(c, '#23295e', 0, 30, ANCHO, 20);
  fondo(c, '#2d3470', 0, 48, ANCHO, 20);
  c.save();
  c.globalAlpha = 0.18;
  elip(c, 90, 22, 70, 6, '#b9a6ff', -0.25, false);
  elip(c, 70, 28, 40, 4, '#ffffff', -0.25, false);
  c.restore();
  for (let i = 0; i < 30; i++) {
    const brillo = Math.sin(v.segundos * 3 + i) > 0.6;
    circ(c, (i * 37) % ANCHO, (i * 53) % 58, brillo ? 0.9 : 0.55, '#dfe3ff', false);
  }
  circ(c, 136, 14, 8, '#fff1b8');
  circ(c, 140, 11, 7, '#1b2052', false);
  circ(c, 133, 16, 1.2, '#f2dc8e', false);
  // Montañas a lo lejos con las luces de un pueblo
  poli(c, [0, 66, 18, 50, 34, 60, 56, 46, 78, 62, 100, 52, 120, 64, 160, 54, 160, 66], '#2a2f63');
  for (let i = 0; i < 9; i++) circ(c, 10 + i * 17, 63 + (i % 2), 0.6, '#ffd84a', false);

  // Flash de la cámara justo después de pulsar
  if (v.desdePulsacion < 0.08) fondo(c, 'rgba(255,255,255,0.35)');

  // Los dos caminos por los que llegan las estrellas
  raya(c, [ORIGEN_X.izquierda, ORIGEN_Y, MIRA_X, MIRA_Y], 1, '#4a5296');
  raya(c, [ORIGEN_X.derecha, ORIGEN_Y, MIRA_X, MIRA_Y], 1, '#4a5296');

  const lados = ladosDeLasEstrellas(v.notas.map((n) => n.pulso));
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
    const origen = ORIGEN_X[lados[i]];
    const x = origen + (MIRA_X - origen) * k;
    const y = ORIGEN_Y + (MIRA_Y - ORIGEN_Y) * k;
    estrella(c, x, y, cometa ? 6.5 : 4, cometa ? '#ff9e6b' : '#ffe07a');
  });

  // Mira del telescopio
  c.beginPath();
  c.arc(MIRA_X, MIRA_Y, 7, 0, Math.PI * 2);
  c.lineWidth = 1;
  c.strokeStyle = '#7cf2c0';
  c.stroke();
  raya(c, [MIRA_X, MIRA_Y - 10, MIRA_X, MIRA_Y + 10], 1, '#7cf2c0');
  raya(c, [MIRA_X - 10, MIRA_Y, MIRA_X + 10, MIRA_Y], 1, '#7cf2c0');

  // Suelo, cúpula y astrónoma
  fondo(c, '#3a3f7a', 0, 66, ANCHO, 24);
  c.beginPath();
  c.arc(118, 66, 22, Math.PI, 0);
  c.closePath();
  c.fillStyle = '#dfe3f0';
  c.fill();
  poli(c, [114, 44.5, 122, 44.5, 122, 66, 114, 66], '#3a3f7a');
  poli(c, [106, 48, 132, 34, 135, 39, 109, 53], '#9aa3c7');
  const brazo = v.desdePulsacion < 0.15 ? 2.4 : 0.6;
  persona(c, 44, 66, {
    ropa: '#7b5fd1',
    piel: '#9a5f3c',
    pelo: '#2a2230',
    brazo,
    contento: v.desdePulsacion < 0.4,
  });
  // La cámara va en la mano (la mano acaba a 9 unidades del hombro, en x + 4,4 y y - 19)
  const camX = 48.4 + Math.sin(brazo) * 9;
  const camY = 47 + Math.cos(brazo) * 9;
  caja(c, camX - 3, camY - 4.4, 6, 4, '#2a2230', 1);
  circ(c, camX, camY - 2.4, 1.2, '#7cf2c0', false);
  // Trípode del telescopio pequeño junto a la astrónoma
  raya(c, [10, 66, 14, 54, 18, 66], 1, '#9aa3c7');
  poli(c, [8, 50, 20, 46, 21, 49, 9, 53], '#9aa3c7');
  textoDeGolpe(c, v, 106, 24, ['¡CLIC!', '¡FLASH!', '¡CHAS!']);
};

export const observatorio: Escenario = {
  dibujar,
  instrucciones:
    'Las estrellas llegan por la izquierda y por la derecha, todas a la misma velocidad: cuanto más juntas vienen, más seguido tendrás que pulsar. Al principio cada compás viene de un lado; después se alternan una a una. Pulsa J cuando cada una llega a la mira del centro. Los cometas grandes y naranjas se fotografían con K.',
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
  grabados: {
    aviso: () => 'observatorio-aviso',
    acierto: () => 'observatorio-acierto',
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Fotos para la portada de la revista!'
      : hype >= 40
        ? 'Un buen álbum de estrellas'
        : 'Todas las fotos han salido movidas',
};
