/**
 * Escenario difícil: Gatos en el tejado.
 * Pregunta y respuesta: el gato naranja mueve la cola con un ritmo y, cuatro
 * pulsos después, tú lo repites con el gato gris. J barre la cola a la
 * izquierda y K a la derecha. El aviso de cada nota es el coletazo del
 * gato naranja, por eso en esta canción aviso_antes vale 4.
 */
import { ANCHO, caja, circ, elip, fondo, poli, raya, TINTA } from './dibujo';
import { DibujarEscena, Escenario } from './tipos';

const LLAMADA = 4; // pulsos entre el coletazo del gato naranja y el tuyo

/** Gato sentado. `golpe` va de 0 (cola en reposo) a 1 (coletazo); `lado` es -1 o 1. */
function gato(
  c: CanvasRenderingContext2D,
  x0: number,
  color: string,
  mira: number,
  golpe: number,
  lado: number,
): void {
  c.save();
  c.translate(x0, 60);
  c.scale(1.5, 1.5);
  const y = -6;
  const a = -1.6 + golpe * 0.9 * lado;
  const bx = -6 * mira;
  const by = y + 1;
  const px = bx + Math.cos(a) * 6 * mira;
  const py = by + Math.sin(a) * 6;
  const fx = bx + Math.cos(a - 0.5 * lado) * 13 * mira;
  const fy = by + Math.sin(a - 0.5 * lado) * 13;
  raya(c, [bx, by, px, py, fx, fy], 3.6);
  raya(c, [bx, by, px, py, fx, fy], 1.8, color);
  elip(c, 0, y, 8, 6, color);
  circ(c, 4 * mira, y - 7, 5.5, color);
  poli(c, [4 * mira - 5, y - 10, 4 * mira - 4, y - 16, 4 * mira - 1, y - 12], color);
  poli(c, [4 * mira + 1, y - 12, 4 * mira + 4, y - 16, 4 * mira + 5, y - 10], color);
  circ(c, 2.5 * mira, y - 7.5, 0.9, TINTA, false);
  circ(c, 6 * mira, y - 7.5, 0.9, TINTA, false);
  if (golpe > 0.5) {
    raya(c, [fx - 3, fy - 3, fx - 5, fy - 5]);
    raya(c, [fx + 3, fy - 3, fx + 5, fy - 5]);
  }
  c.restore();
}

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#2c3a73');
  circ(c, 128, 16, 9, '#fff4c2');
  const edificios: [number, number, number, string][] = [
    [0, 30, 40, '#3f4f94'],
    [38, 22, 32, '#4a5ba6'],
    [68, 34, 36, '#3f4f94'],
    [102, 26, 60, '#4a5ba6'],
  ];
  for (const [x, y, w, color] of edificios) {
    caja(c, x, y, w, 50, color, 0.5);
    for (let i = x + 5; i < x + w - 5; i += 9) {
      for (let j = y + 6; j < 56; j += 11)
        caja(c, i, j, 4, 5, (i + j) % 3 ? '#ffd76e' : '#2c3a73', 0.5);
    }
  }
  caja(c, -2, 60, ANCHO + 4, 32, '#a5523f', 0.5);
  for (let x = 0; x < ANCHO; x += 12) {
    c.beginPath();
    c.arc(x + 6, 60, 6, 0, Math.PI);
    c.stroke();
  }

  // Gato naranja: coletazo LLAMADA pulsos antes de cada nota, hacia el lado de su tecla
  let golpeNaranja = 0;
  let ladoNaranja = -1;
  v.notas.forEach((n, i) => {
    const desde = v.pulso - (n.pulso - LLAMADA);
    if (desde >= 0 && desde < 0.4) {
      golpeNaranja = 1 - desde / 0.4;
      ladoNaranja = v.teclas[i] === 'accion' ? -1 : 1;
    }
  });
  // Gato gris: tu coletazo, hacia el lado de la tecla que pulsas
  const golpeGris = v.desdePulsacion < 0.18 ? 1 - v.desdePulsacion / 0.18 : 0;
  const ladoGris = v.ultimaTecla === 'alterna' ? 1 : -1;
  gato(c, 42, '#f39c3c', 1, golpeNaranja, ladoNaranja);
  gato(c, 118, '#9aa3ad', -1, golpeGris, -ladoGris);

  // Bocadillo: el turno cambia cada cuatro pulsos
  const escucha = v.pulso < 4 || Math.floor((v.pulso - 4) / LLAMADA) % 2 === 0;
  caja(c, escucha ? 25 : 101, 18, 34, 9, '#ffffff', 4);
  c.save();
  c.font = '700 6px system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillStyle = TINTA;
  c.fillText(escucha ? 'ESCUCHA' : 'TU TURNO', escucha ? 42 : 118, 24.5);
  c.restore();
};

export const tejado: Escenario = {
  dibujar,
  instrucciones:
    'El gato naranja mueve la cola con un ritmo y luego te toca a ti repetirlo con el gato gris. J barre la cola a la izquierda y K a la derecha, igual que él.',
  aviso: (m, t, tecla) => {
    // Coletazo del gato naranja: un zas de ruido, más agudo hacia la derecha (K)
    m.ruido(t, 0.09, 0.12, 'bandpass', tecla === 'accion' ? 1200 : 2600);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Los gatos más sincronizados del barrio!'
      : hype >= 40
        ? 'El gato naranja está satisfecho'
        : 'El gato naranja se ha ido ofendido',
};
