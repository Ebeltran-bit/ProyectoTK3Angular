/**
 * Escenario medio: Ramen a contratiempo (rediseñado tras las pruebas de Eva del 01/11/2026).
 * Cada verdura llega a la tabla con líneas de puntos, una por corte (J en el
 * pulso). Después del último corte la tapa de la olla se levanta y sale
 * vapor: medio pulso después, K a contratiempo para echarlo todo. Entonces
 * entra una verdura distinta y la olla se va llenando de colores.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  fondo,
  onomatopeya,
  persona,
  poli,
  raya,
  TINTA,
  tono,
  ultimoGolpe,
} from './dibujo';
import { DibujarEscena, Escenario, VistaEscena } from './tipos';

interface Verdura {
  nombre: string;
  color: string;
  hoja: string;
}

const VERDURAS: Verdura[] = [
  { nombre: 'zanahoria', color: '#f28a2e', hoja: '#4fb04a' },
  { nombre: 'cebolleta', color: '#b6e37a', hoja: '#3f8f3a' },
  { nombre: 'seta', color: '#f2e2c8', hoja: '#a8653a' },
  { nombre: 'pimiento', color: '#e8505b', hoja: '#3f8f3a' },
  { nombre: 'maíz', color: '#ffd84a', hoja: '#7cc56a' },
  { nombre: 'nabo', color: '#f4f1f8', hoja: '#9b59b6' },
];

/** Una tanda: los cortes (J) de una verdura y el momento de echarla a la olla (K). */
interface Tanda {
  cortes: number[]; // índices de las notas J
  olla: number; // índice de la nota K
  verdura: Verdura;
}

/** Agrupa las notas en tandas: todas las J seguidas que terminan en una K. */
export function tandas(teclas: ('accion' | 'alterna')[]): Tanda[] {
  const lista: Tanda[] = [];
  let cortes: number[] = [];
  teclas.forEach((tecla, i) => {
    if (tecla === 'accion') cortes.push(i);
    else {
      lista.push({ cortes, olla: i, verdura: VERDURAS[lista.length % VERDURAS.length] });
      cortes = [];
    }
  });
  return lista;
}

/** Pulsos antes de la K en que la tapa empieza a levantarse: va por tiempo, no espera a los cortes. */
const AVISO_OLLA = 1.5;
const ANCHO_TROZO = 7;
const TABLA_Y = 50;

function decorado(c: CanvasRenderingContext2D, t: number): void {
  // Pared de azulejos, cortina noren y farolillos que se balancean
  fondo(c, '#fff0d6');
  for (let x = 0; x < ANCHO; x += 8)
    for (let y = 22; y < 58; y += 8) caja(c, x + 0.5, y + 0.5, 7, 7, '#ffe4bd', 1, false);
  fondo(c, '#3b4a8c', 0, 0, ANCHO, 14);
  for (let x = 0; x < ANCHO; x += 32) {
    poli(c, [x + 1, 0, x + 31, 0, x + 31, 13, x + 1, 13], '#3b4a8c');
    circ(c, x + 16, 6.5, 3.4, '#ffffff');
    circ(c, x + 16, 6.5, 1.8, '#3b4a8c', false);
  }
  for (let i = 0; i < 4; i++) {
    const y = 16 + Math.sin(t * 2 + i) * 1;
    raya(c, [20 + i * 40, 13, 20 + i * 40, y]);
    elip(c, 20 + i * 40, y + 6, 5, 6.5, '#e8505b');
    raya(c, [15.6 + i * 40, y + 6, 24.4 + i * 40, y + 6], 0.7);
    caja(c, 17.6 + i * 40, y - 1, 4.8, 1.6, TINTA, 0.5);
  }
  // Barra de madera y cuencos esperando
  caja(c, -2, 58, ANCHO + 4, 34, '#c98a55', 0.5);
  for (let x = 0; x < ANCHO; x += 22) raya(c, [x, 62, x + 12, 62], 0.6, '#a86a3d');
  for (const bx of [12, 146]) {
    poli(c, [bx - 7, 72, bx + 7, 72, bx + 5, 79, bx - 5, 79], '#ffffff');
    raya(c, [bx - 6, 74, bx + 6, 74], 0.8, '#e8505b');
  }
}

/** Lo que queda de la verdura entera, con su cabeza característica a la izquierda. */
function verduraEntera(c: CanvasRenderingContext2D, v: Verdura, x0: number, largo: number): void {
  const y = TABLA_Y;
  // Se dibuja un poco más alta de lo que mide para que se vea bien
  c.save();
  c.translate(0, y);
  c.scale(1, 1.35);
  c.translate(0, -y);
  if (v.nombre === 'zanahoria') {
    poli(
      c,
      [x0, y - 3.6, x0 + largo, y - 1.2, x0 + largo + 3, y, x0 + largo, y + 1.2, x0, y + 3.6],
      v.color,
    );
    raya(c, [x0 + largo * 0.3, y - 2.6, x0 + largo * 0.3, y - 1.2], 0.6);
    raya(c, [x0 - 1, y - 1, x0 - 6, y - 5], 1.4, v.hoja);
    raya(c, [x0 - 1, y, x0 - 7, y - 1.5], 1.4, v.hoja);
  } else if (v.nombre === 'cebolleta') {
    caja(c, x0, y - 2.4, largo, 4.8, v.color, 2.4);
    caja(c, x0 + largo - 5, y - 2.4, 5, 4.8, '#ffffff', 2.4);
    raya(c, [x0, y - 1, x0 - 8, y - 4], 1.6, v.hoja);
  } else if (v.nombre === 'seta') {
    caja(c, x0 + 3, y - 1.6, largo - 3, 4, v.color, 1.8);
    elip(c, x0 + 3, y, 4, 6, v.hoja);
    circ(c, x0 + 2, y - 2.6, 0.8, tono(v.hoja, 0.4), false);
  } else if (v.nombre === 'pimiento') {
    elip(c, x0 + largo / 2, y, largo / 2 + 1, 4, v.color);
    caja(c, x0 - 3, y - 1, 4, 2, v.hoja, 1);
  } else if (v.nombre === 'maíz') {
    elip(c, x0 + largo / 2, y, largo / 2 + 1, 3.8, v.color);
    for (let k = x0 + 2; k < x0 + largo - 1; k += 2.2)
      for (const dy of [-1.6, 0.4]) circ(c, k, y + dy, 0.5, tono(v.color, -0.2), false);
    poli(c, [x0 + 2, y - 4, x0 - 6, y - 1, x0 + 2, y + 4], v.hoja);
  } else {
    elip(c, x0 + largo / 2, y, largo / 2 + 1, 4, v.color);
    elip(c, x0 + 2, y, 3, 3.8, v.hoja);
    raya(c, [x0 - 1, y - 1, x0 - 6, y - 5], 1.4, '#4fb04a');
  }
  c.restore();
}

/** Un trozo ya cortado: una rodaja del color de la verdura (torcida si el corte falló). */
function trozo(c: CanvasRenderingContext2D, v: Verdura, x: number, y: number, malo: boolean): void {
  c.save();
  c.translate(x, y);
  c.rotate(malo ? 0.5 : 0);
  caja(c, -2.6, -3.2, 5.2, 6.4, v.color, 1.8);
  circ(c, 0, 0, 1, tono(v.color, -0.15), false);
  c.restore();
}

/** Qué tanda está en la tabla: la última que ya ha empezado a entrar. */
function tandaActual(v: VistaEscena, lista: Tanda[]): number {
  let actual = 0;
  lista.forEach((ta, i) => {
    const primera = v.notas[ta.cortes[0] ?? ta.olla].pulso;
    if (v.pulso >= primera - 1.2) actual = i;
  });
  return actual;
}

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  decorado(c, t);
  const lista = tandas(v.teclas);
  if (lista.length === 0) return;
  const indice = tandaActual(v, lista);
  const ta = lista[indice];
  const olla = v.notas[ta.olla];
  const cortados = ta.cortes.filter((i) => v.notas[i].juicio !== null);
  const enOlla = olla.juicio !== null && olla.juicio !== 'miss';

  // La tapa se levanta por tiempo: siempre pulso y medio antes de la K, pase lo que pase con los cortes
  const falta = olla.pulso - v.pulso;
  const tapa =
    olla.juicio === null && falta <= AVISO_OLLA ? Math.min(1, (AVISO_OLLA - falta) / 0.5) : 0;

  // Olla con los trozos de las verduras que ya se han echado
  const echadas = lista.filter(
    (x) =>
      v.notas[x.olla].juicio !== null &&
      v.notas[x.olla].juicio !== 'miss' &&
      v.pulso >= v.notas[x.olla].pulso + 0.4,
  );
  caja(c, 100, 38, 40, 21, '#7d8796', 3);
  caja(c, 97, 41, 4, 4, '#5f6878', 1.5);
  caja(c, 139, 41, 4, 4, '#5f6878', 1.5);
  elip(c, 120, 38.6, 18, 2.6, '#f6c26b');
  echadas
    .slice(-10)
    .forEach((x, i) =>
      circ(c, 106 + (i % 5) * 7, 38.4 + Math.floor(i / 5) * 1, 1.6, x.verdura.color),
    );
  c.save();
  // La tapa gira sobre su borde izquierdo y se abre por la derecha
  c.translate(100, 37);
  c.rotate(-0.55 * tapa);
  caja(c, 0, -3, 40, 3.4, '#a3acba', 1.7);
  caja(c, 18, -5.4, 4, 2.6, '#5f6878', 1);
  c.restore();
  // Vapor: poco si la tapa está cerrada, mucho cuando se levanta
  const nubes = tapa > 0 ? 5 : 2;
  for (let i = 0; i < nubes; i++)
    elip(
      c,
      106 + i * 6,
      30 - ((t * 12 + i * 5) % 14) - tapa * 4,
      2.4 + tapa * 1.6,
      1.8 + tapa * 1.4,
      '#ffffff',
    );
  if (tapa >= 1) onomatopeya(c, 120, 18, '¡K!', 0.25, '#ffc93c');

  // Trozos que vuelan a la olla al echarlos (o que caen fuera si fallas)
  if (olla.juicio !== null && v.pulso >= olla.pulso && v.pulso - olla.pulso < 0.5) {
    const k = (v.pulso - olla.pulso) / 0.5;
    const bien = olla.juicio !== 'miss';
    for (let i = 0; i < cortados.length; i++)
      trozo(
        c,
        ta.verdura,
        60 + k * (bien ? 58 : 34) + i * 3,
        46 - Math.sin(k * Math.PI) * 18 + (bien ? 0 : k * 16),
        !bien,
      );
  }

  // Tabla de cortar, chef detrás y la verdura que entra deslizándose desde la izquierda
  persona(c, 54, 52, {
    ropa: '#ffffff',
    piel: '#f2c19a',
    pantalon: '#2a2230',
    mira: 1,
    brazo: 0.3,
    contento: enOlla && v.pulso - olla.pulso < 0.6,
    gorro: (g, x, y) => {
      caja(g, x - 6.5, y - 11, 13, 5, '#ffffff', 1);
      elip(g, x, y - 13.5, 8, 5, '#ffffff');
    },
  });
  caja(c, 18, TABLA_Y + 3, 70, 6, '#f2cf8c', 2);
  raya(c, [20, TABLA_Y + 5, 86, TABLA_Y + 5], 0.5, '#d9b06c');

  const primera = v.notas[ta.cortes[0] ?? ta.olla].pulso;
  const entra = Math.min(1, Math.max(0, (v.pulso - (primera - 1.2)) / 0.7));
  const n = ta.cortes.length;
  const x0 = 26 - 70 * (1 - entra);
  const echada = olla.juicio !== null && v.pulso >= olla.pulso;
  if (!echada) {
    // Trozos ya cortados, apartados a la derecha
    cortados.forEach((i, k) =>
      trozo(
        c,
        ta.verdura,
        x0 + 12 + (n - k - 1) * ANCHO_TROZO + 6 + k * 1.6,
        TABLA_Y,
        v.notas[i].juicio === 'miss',
      ),
    );
    const resto = 12 + (n - cortados.length) * ANCHO_TROZO;
    verduraEntera(c, ta.verdura, x0, resto);
    // Líneas de puntos: una por cada corte que falta
    c.save();
    c.setLineDash([1.2, 1.2]);
    for (let i = 0; i < n - cortados.length; i++) {
      const lx = x0 + resto - ANCHO_TROZO * (i + 1) + 3.5;
      raya(c, [lx, TABLA_Y - 6, lx, TABLA_Y + 6], 0.9);
    }
    c.restore();
    // Los trozos brillan cuando ya está todo cortado: toca echarlos
    if (tapa > 0 && cortados.length === n)
      for (let k = 0; k < n; k++)
        circ(c, x0 + 14 + k * ANCHO_TROZO + 6, TABLA_Y - 5, 0.8, '#ffffff', false);
  }

  // Cuchillo sobre la línea del próximo corte: sube antes del pulso y baja al pulsar
  const proximo = ta.cortes.find((i) => v.notas[i].juicio === null);
  const resto = 12 + (n - cortados.length) * ANCHO_TROZO;
  const enTabla = !echada && entra >= 1;
  const lx = enTabla
    ? Math.min(72, proximo !== undefined ? x0 + resto - ANCHO_TROZO + 3.5 : x0 + resto + 3)
    : 66;
  const corta = v.desdePulsacion < 0.12 && v.ultimaTecla === 'accion';
  const sube = enTabla && proximo !== undefined && v.notas[proximo].pulso - v.pulso < 0.5;
  const yk = corta ? TABLA_Y - 4 : sube ? TABLA_Y - 16 : TABLA_Y - 11;
  raya(c, [58.4, 33, lx + 1.2, yk - 6], 4);
  raya(c, [58.4, 33, lx + 1.2, yk - 6], 2.2, '#ffffff');
  caja(c, lx - 0.4, yk - 8, 3.2, 4.4, '#5c3b24', 1);
  poli(
    c,
    [lx - 1.4, yk - 3.6, lx + 3.6, yk - 3.6, lx + 3.6, yk + 6, lx - 1.4, yk + 3.6],
    '#e6ebf2',
  );
  circ(c, lx + 1.2, yk - 6, 2, '#f2c19a');

  // Onomatopeyas: ¡CHAC! en cada corte y ¡CHOF! al echar a la olla
  const golpe = ultimoGolpe(v, 0.5);
  if (golpe) {
    const esOlla = v.teclas[golpe.indice] === 'alterna';
    if (!golpe.acierto) onomatopeya(c, esOlla ? 120 : 36, 28, '¡UY!', golpe.k, '#ff6b6b');
    else onomatopeya(c, esOlla ? 120 : 36, 28, esOlla ? '¡CHOF!' : '¡CHAC!', golpe.k);
  }
};

export const ramen: Escenario = {
  dibujar,
  instrucciones:
    'Cada verdura llega con líneas de puntos, una por corte: pulsa J en el pulso para cada corte. Cuando ya no quedan líneas, la tapa de la olla se levanta y sale vapor: pulsa K a contratiempo para echarlo todo. Entonces entra otra verdura.',
  aviso: (m, t, tecla) => {
    // Corte: golpe seco de madera. Olla: la tapa tintinea
    if (tecla === 'accion') m.tono('square', 1500, t, 0.03, 0.04);
    else {
      m.tono('square', 1568, t, 0.04, 0.03);
      const o = m.tono('sine', 300, t, 0.15, 0.1);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    }
  },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Cola en la puerta del restaurante!'
      : hype >= 40
        ? 'Un ramen bastante rico'
        : 'La sopa se ha quedado sin verduras',
};
