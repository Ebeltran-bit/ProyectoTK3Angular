/**
 * Escenario difícil: La mecanógrafa.
 * Cada línea dura cuatro pulsos: J para cada letra al ritmo de la música y
 * K para la campanilla del final, que devuelve el carro a la izquierda.
 * La pauta de la mesa enseña qué tecla toca y cuándo: la línea actual con su
 * cursor y, debajo, la siguiente.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  extremidad,
  fondo,
  poli,
  raya,
  textoDeGolpe,
  TINTA,
  tono,
} from './dibujo';
import { DibujarEscena, Escenario, VistaEscena } from './tipos';

const INICIO = 4; // pulso de la primera línea (después de la cuenta atrás)
const PULSOS_LINEA = 4;
const PAUTA_X = 14;
const ANCHO_PULSO = 33; // unidades de la pauta por cada pulso

/** Una línea de la pauta: una casilla por nota, J en blanco y K en amarillo. */
function filaPauta(
  c: CanvasRenderingContext2D,
  v: VistaEscena,
  linea: number,
  y: number,
  alto: number,
): void {
  caja(c, PAUTA_X - 6, y, ANCHO_PULSO * PULSOS_LINEA + 6, alto, '#f7f3e8', 1);
  c.save();
  c.font = `700 ${alto - 3}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  v.notas.forEach((n, i) => {
    const p = n.pulso - INICIO;
    if (p < 0 || Math.floor(p / PULSOS_LINEA) !== linea) return;
    const x = PAUTA_X + (p - linea * PULSOS_LINEA) * ANCHO_PULSO;
    const esK = v.teclas[i] === 'alterna';
    const pendiente = esK ? '#ffc93c' : '#ffffff';
    const color = n.juicio === null ? pendiente : n.juicio === 'miss' ? '#e0435f' : '#7cf2c0';
    caja(c, x - 5, y + 1, 10, alto - 2, color, 1);
    c.fillStyle = TINTA;
    c.fillText(esK ? 'K' : 'J', x, y + alto / 2 + 0.3);
  });
  c.restore();
}

/** Mano de la mecanógrafa vista desde arriba: sale de la manga y tiene los dedos sobre las teclas. */
function manoEscribiendo(c: CanvasRenderingContext2D, x: number, y: number): void {
  extremidad(c, x, y + 8, x, y + 2.6, 4.6, 4, 0, '#7b5fd1');
  for (const d of [-1.9, -0.6, 0.7, 2]) circ(c, x + d, y - 1.6, 0.95, PIEL, false);
  elip(c, x, y, 3.2, 2.5, PIEL);
  elip(c, x - 3, y + 0.6, 0.9, 1.4, PIEL, -0.5, false);
  caja(c, x - 2.6, y + 2.2, 5.2, 1.6, tono('#7b5fd1', 0.3), 0.8, false);
}

const PIEL = '#c68642';

const dibujar: DibujarEscena = (c, v) => {
  // Oficina: papel pintado, ventana con la ciudad, tablón, planta y taza
  fondo(c, '#cfe0d8');
  for (let x = 0; x < ANCHO; x += 12) fondo(c, '#c4d8cf', x, 0, 6, 62);
  caja(c, 10, 8, 40, 26, '#f7f3e8', 1);
  for (let i = 0; i < 4; i++) raya(c, [14, 14 + i * 5, 46, 14 + i * 5], 0.6, '#b9c4cc');
  caja(c, 40, 6, 8, 6, '#ffd84a', 0.5);
  circ(c, 44, 7, 1, '#e8505b');
  // Planta apoyada en la mesa (el tablero empieza en y = 62)
  elip(c, 144, 46, 4, 7, '#4fa64a', -0.4);
  elip(c, 150, 45, 4, 8, '#5cb856', 0.4);
  poli(c, [141.4, 52, 152.6, 52, 151.4, 62, 142.6, 62], '#c46a2b');
  caja(c, 140.8, 51, 12.4, 2.6, '#d77d3c', 1);
  caja(c, 20, 54, 8, 8, '#ffffff', 1.5);
  c.beginPath();
  c.arc(28, 58, 2, -Math.PI / 2, Math.PI / 2);
  c.lineWidth = 1.2;
  c.strokeStyle = '#dfe6ea';
  c.stroke();
  for (let k = 0; k < 2; k++) {
    const y = 51 - k * 3 - ((v.segundos * 2) % 3);
    raya(c, [23 + k * 2, y, 24 + k * 2, y - 2], 0.6, '#9aa3a8');
  }
  // Reloj de la oficina: la aguja da una vuelta cada cuatro pulsos
  caja(c, 118, 6, 22, 22, '#ffffff', 11);
  const ang = (v.pulso / PULSOS_LINEA) * Math.PI * 2;
  raya(c, [129, 17, 129 + Math.sin(ang) * 7, 17 - Math.cos(ang) * 7]);
  raya(c, [129, 17, 133, 19]);
  caja(c, -2, 62, ANCHO + 4, 30, '#8a5a36', 0.5);

  // Línea actual y letras escritas en ella (las fallidas salen en rojo)
  const linea = Math.max(0, Math.floor((v.pulso - INICIO) / PULSOS_LINEA));
  const enLinea = (p: number) => Math.floor((p - INICIO) / PULSOS_LINEA) === linea;
  const letras: string[] = [];
  let campana = false;
  v.notas.forEach((n, i) => {
    if (!enLinea(n.pulso) || n.juicio === null) return;
    if (v.teclas[i] === 'accion') letras.push(n.juicio === 'miss' ? '#e0435f' : TINTA);
    else campana = n.juicio !== 'miss' && v.pulso - n.pulso < 0.5;
  });

  // Papel y carro: el carro se desplaza a la izquierda con cada letra
  const carro = 16 - letras.length * 3;
  const subida = (linea % 4) * 2;
  caja(c, 56 + carro, 14 - subida, 36, 26, '#ffffff', 0.5);
  for (let l = 1; l <= Math.min(linea, 3); l++) {
    for (let k = 0; k < 6; k++)
      caja(c, 60 + carro + k * 3.6, 34 - subida - l * 4, 2.4, 1.6, '#8c96a0', 0, false);
  }
  letras.forEach((color, k) =>
    caja(c, 60 + carro + k * 3.6, 34 - subida, 2.4, 1.6, color, 0, false),
  );
  caja(c, 50 + carro, 38, 48, 5, '#2f4858', 2);

  // Máquina y teclas: se ilumina la que acabas de pulsar
  poli(c, [46, 44, 114, 44, 122, 62, 38, 62], '#e8505b');
  const pulsando = v.desdePulsacion < 0.1 && v.ultimaTecla === 'accion';
  for (let fila = 0; fila < 2; fila++) {
    for (let k = 0; k < 8; k++) {
      const activa = pulsando && fila === 0 && k === letras.length % 8;
      circ(
        c,
        52 + k * 8 + fila * 4,
        50 + fila * 6 + (activa ? 1 : 0),
        2.4,
        activa ? '#ffc93c' : '#ffffff',
      );
    }
  }
  // Palanca del carro y campanilla
  raya(c, [98 + carro, 40, 106 + carro, 34], 1.6, '#2f4858');
  if (campana) {
    circ(c, 112, 40, 3, '#ffc93c');
    raya(c, [116, 36, 119, 33]);
    raya(c, [117, 40, 121, 40]);
  }
  // Manos
  const golpe = pulsando ? 1 - v.desdePulsacion / 0.1 : 0;
  manoEscribiendo(c, 60 + (letras.length % 4) * 3, 61 - golpe * 3);
  manoEscribiendo(c, 92 + (letras.length % 4) * 2, 62);

  // Pauta: el cursor recorre la línea actual; cada casilla se pulsa cuando llega a ella
  filaPauta(c, v, linea, 66, 11);
  filaPauta(c, v, linea + 1, 79, 9);
  if (v.pulso >= INICIO) {
    const x = PAUTA_X + (v.pulso - INICIO - linea * PULSOS_LINEA) * ANCHO_PULSO;
    raya(c, [x, 64.5, x, 78], 1.6, '#e0435f');
  }
  textoDeGolpe(c, v, 130, 46, ['¡TAC!', '¡CLAC!', '¡TIC!']);
};

export const mecanografa: Escenario = {
  dibujar,
  instrucciones:
    'Sigue la pauta: cuando el cursor rojo llega a una casilla, pulsa J para las letras y K para la campanilla que cierra la línea.',
  aviso: (m, t, tecla) => {
    // Clic suave antes de cada letra; un pulso antes de la K, la campanilla
    if (tecla === 'accion') m.tono('square', 2400, t, 0.015, 0.02);
    else m.tono('triangle', 1760, t, 0.25, 0.09);
  },
  grabados: {
    aviso: (tecla) => (tecla === 'alterna' ? 'mecanografa-campanilla' : undefined),
    acierto: (tecla) => (tecla === 'alterna' ? 'mecanografa-campanilla' : 'mecanografa-acierto'),
  },
  teclas: { accion: { texto: 'Letra' }, alterna: { texto: 'Campanilla', nota: 'Fin de línea' } },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Ni una errata en toda la página!'
      : hype >= 40
        ? 'Una carta con un par de tachones'
        : 'La jefa pide que la vuelvas a escribir',
};
