/**
 * Escenario difícil: La mecanógrafa.
 * Cada línea dura cuatro pulsos: J para cada letra al ritmo de la música y
 * K para la campanilla del final, que devuelve el carro a la izquierda.
 * La pauta de la mesa enseña qué tecla toca y cuándo: la línea actual con su
 * cursor y, debajo, la siguiente.
 */
import { ANCHO, caja, circ, fondo, poli, raya, TINTA } from './dibujo';
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

const dibujar: DibujarEscena = (c, v) => {
  fondo(c, '#cfe0d8');
  caja(c, 10, 8, 40, 26, '#f7f3e8', 1);
  for (let i = 0; i < 4; i++) raya(c, [14, 14 + i * 5, 46, 14 + i * 5], 0.6, '#b9c4cc');
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
  raya(c, [98 + carro, 40, 106 + carro, 34], 1.6);
  if (campana) {
    circ(c, 112, 40, 3, '#ffc93c');
    raya(c, [116, 36, 119, 33]);
    raya(c, [117, 40, 121, 40]);
  }
  // Manos
  const golpe = pulsando ? 1 - v.desdePulsacion / 0.1 : 0;
  circ(c, 60 + (letras.length % 4) * 3, 62 - golpe * 3, 3.2, '#c68642');
  circ(c, 92 + (letras.length % 4) * 2, 63, 3.2, '#c68642');

  // Pauta: el cursor recorre la línea actual; cada casilla se pulsa cuando llega a ella
  filaPauta(c, v, linea, 66, 11);
  filaPauta(c, v, linea + 1, 79, 9);
  if (v.pulso >= INICIO) {
    const x = PAUTA_X + (v.pulso - INICIO - linea * PULSOS_LINEA) * ANCHO_PULSO;
    raya(c, [x, 64.5, x, 78], 1.6, '#e0435f');
  }
};

export const mecanografa: Escenario = {
  dibujar,
  instrucciones:
    'Mira la pauta de abajo: cuando el cursor rojo llega a una casilla, pulsa su tecla. J para las letras (blancas) y K para la campanilla (amarilla), que siempre cierra la línea. La fila de debajo es la línea que viene.',
  aviso: (m, t, tecla) => {
    // Clic suave antes de cada letra; un pulso antes de la K, la campanilla
    if (tecla === 'accion') m.tono('square', 2400, t, 0.015, 0.02);
    else m.tono('triangle', 1760, t, 0.25, 0.09);
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Ni una errata en toda la página!'
      : hype >= 40
        ? 'Una carta con un par de tachones'
        : 'La jefa pide que la vuelvas a escribir',
};
