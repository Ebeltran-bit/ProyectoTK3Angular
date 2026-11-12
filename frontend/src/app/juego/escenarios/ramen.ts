/**
 * Escenario medio: Ramen a contratiempo (rehecho tras las pruebas de Eva del 05/11/2026).
 * Cada verdura avanza por la tabla hacia un cuchillo fijo. Lleva líneas de
 * puntos, y cada línea llega bajo el cuchillo justo en el pulso de su corte
 * (J): la distancia entre líneas es el ritmo. Medio pulso después del último
 * corte, con la tapa ya levantada, K a contratiempo para echar los trozos a
 * la olla. Una línea solo desaparece si la cortas tú.
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
  mano,
  extremidad,
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
const AVISO_OLLA = 1;
/** El cuchillo no se mueve: las líneas de corte llegan a él en su pulso. */
const X_CUCHILLO = 62;
/** Unidades que avanza la verdura en un pulso. */
const AVANCE = 20;
/** Donde se amontonan los trozos cortados, al final de la tabla. */
const X_MONTON = 88;
const TABLA_Y = 50;
const LARGO_PUNTA = 5;
const LARGO_CABEZA = 10;

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
    raya(c, [20 + i * 40, 13, 20 + i * 40, y], 0.6, '#2a3366');
    elip(c, 20 + i * 40, y + 6, 5, 6.5, '#e8505b');
    raya(c, [15.6 + i * 40, y + 6, 24.4 + i * 40, y + 6], 0.7, '#c2364f');
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

/** Hojas, sombrero o rabito del extremo que no se corta: así se distingue cada verdura. */
function cabeza(c: CanvasRenderingContext2D, v: Verdura, x: number): void {
  const y = TABLA_Y;
  if (v.nombre === 'seta') {
    elip(c, x + 3, y, 4, 6.5, v.hoja);
    circ(c, x + 2, y - 2.6, 0.9, tono(v.hoja, 0.4), false);
  } else if (v.nombre === 'pimiento') {
    caja(c, x - 3, y - 1.2, 4, 2.4, v.hoja, 1);
  } else if (v.nombre === 'maíz') {
    poli(c, [x + 3, y - 4.6, x - 6, y - 1, x + 3, y + 4.6], v.hoja);
  } else {
    raya(c, [x, y - 1, x - 6, y - 6], 1.6, v.hoja);
    raya(c, [x, y + 0.5, x - 7, y - 1.5], 1.6, v.hoja);
  }
}

/** Un trozo de verdura en la tabla: un rectángulo redondeado con su color. */
function pieza(c: CanvasRenderingContext2D, v: Verdura, x0: number, x1: number): void {
  const alto = v.nombre === 'cebolleta' ? 6.4 : 8.4;
  caja(c, x0, TABLA_Y - alto / 2, x1 - x0, alto, v.color, 2.4);
  if (v.nombre === 'maíz')
    for (let k = x0 + 1.6; k < x1 - 1; k += 2.2)
      for (const dy of [-1.8, 0.6]) circ(c, k, TABLA_Y + dy, 0.5, tono(v.color, -0.2), false);
  else
    raya(
      c,
      [x0 + 1.4, TABLA_Y - alto / 2 + 1.6, x1 - 1.4, TABLA_Y - alto / 2 + 1.6],
      0.7,
      tono(v.color, 0.3),
    );
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

const acertada = (n: { juicio: string | null }) => n.juicio !== null && n.juicio !== 'miss';

/**
 * Dibuja una verdura en la tabla. Devuelve dónde quedan sus trozos ya cortados,
 * para que vuelen a la olla cuando se pulse K.
 */
function verduraEnTabla(c: CanvasRenderingContext2D, v: VistaEscena, ta: Tanda): number[] {
  const pulsos = ta.cortes.map((i) => v.notas[i].pulso);
  const ultimo = pulsos[pulsos.length - 1];
  // Avanza hasta que su último corte llega al cuchillo y ahí se para
  const ahora = Math.min(v.pulso, ultimo);
  const lineas = pulsos.map((p) => X_CUCHILLO - (p - ahora) * AVANCE);
  // Bordes de derecha a izquierda: punta, cada línea y el final de la cabeza
  const bordes = [lineas[0] + LARGO_PUNTA, ...lineas, lineas[lineas.length - 1] - LARGO_CABEZA];
  // Se separa un trozo solo en las líneas bien cortadas; el resto sigue unido
  const grupos: [number, number][] = [];
  let derecha = bordes[0];
  ta.cortes.forEach((i, k) => {
    if (acertada(v.notas[i])) {
      grupos.push([lineas[k], derecha]);
      derecha = lineas[k];
    }
  });
  const cabezaX = bordes[bordes.length - 1];
  // Los trozos que ya han pasado el cuchillo se amontonan al final de la tabla
  const sueltos: number[] = [];
  let tope = X_MONTON;
  for (const [x0, x1] of grupos) {
    const w = x1 - x0;
    const desde = Math.min(x0 + 1, tope - w);
    pieza(c, ta.verdura, desde, desde + w - 0.8);
    sueltos.push(desde + w / 2);
    tope = desde - 0.6;
  }
  // La parte que sigue entera, con sus líneas de puntos pendientes
  pieza(c, ta.verdura, cabezaX, derecha);
  cabeza(c, ta.verdura, cabezaX);
  c.save();
  ta.cortes.forEach((i, k) => {
    const n = v.notas[i];
    const lx = lineas[k];
    if (n.juicio === null) {
      c.setLineDash([1.2, 1.2]);
      raya(c, [lx, TABLA_Y - 6, lx, TABLA_Y + 6], 0.9);
    } else if (n.juicio === 'miss') {
      // Corte fallado: una marca torcida y el trozo sigue pegado
      c.setLineDash([]);
      raya(c, [lx - 1.4, TABLA_Y - 4, lx + 1.4, TABLA_Y + 4], 0.9, '#e0435f');
    }
  });
  c.restore();
  return sueltos;
}

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  decorado(c, t);
  const lista = tandas(v.teclas).filter((ta) => ta.cortes.length > 0);
  if (lista.length === 0) return;

  // La tanda de la olla: la primera cuya K aún no ha pasado (o acaba de pasar)
  const actual =
    lista.find((ta) => v.pulso < v.notas[ta.olla].pulso + 0.6) ?? lista[lista.length - 1];
  const olla = v.notas[actual.olla];
  const falta = olla.pulso - v.pulso;
  // La tapa se levanta por tiempo: un pulso antes de la K, del todo justo a contratiempo
  const tapa =
    olla.juicio === null && falta <= AVISO_OLLA ? Math.min(1, (AVISO_OLLA - falta) / 0.5) : 0;

  // Olla con los trozos de las verduras que ya se han echado
  const echadas = lista.filter(
    (x) => acertada(v.notas[x.olla]) && v.pulso >= v.notas[x.olla].pulso + 0.4,
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
  if (tapa >= 1) onomatopeya(c, 120, 18, '¡K!', 0.25, '#ff9e3d');

  // Chef detrás de la tabla
  persona(c, 48, 52, {
    ropa: '#ffffff',
    piel: '#f2c19a',
    pantalon: '#2a2230',
    mira: 1,
    brazo: 0.3,
    contento: acertada(olla) && v.pulso - olla.pulso < 0.6,
    gorro: (g, x, y) => {
      caja(g, x - 6.5, y - 11, 13, 5, '#ffffff', 1);
      elip(g, x, y - 13.5, 8, 5, '#ffffff');
    },
  });
  caja(c, 14, TABLA_Y + 4, 78, 6, '#f2cf8c', 2);
  raya(c, [16, TABLA_Y + 6, 90, TABLA_Y + 6], 0.5, '#d9b06c');

  // Verduras en la tabla: las que están llegando y la que espera a la olla
  for (const ta of lista) {
    const k = v.notas[ta.olla];
    const primera = v.notas[ta.cortes[0]].pulso;
    if (v.pulso < primera - 4 || v.pulso > k.pulso + 0.5) continue;
    const echada = k.juicio !== null && v.pulso >= k.pulso;
    if (!echada) {
      verduraEnTabla(c, v, ta);
      continue;
    }
    // Pulsada la K: los trozos vuelan a la olla, o caen al suelo si fallas
    c.save();
    c.globalAlpha = 0;
    const sueltos = verduraEnTabla(c, v, ta);
    c.restore();
    const kk = (v.pulso - k.pulso) / 0.5;
    const bien = acertada(k);
    sueltos.forEach((x, i) =>
      trozo(
        c,
        ta.verdura,
        x + kk * ((bien ? 112 + i * 3 : x + 20) - x),
        TABLA_Y - 4 - Math.sin(kk * Math.PI) * 18 + (bien ? -kk * 8 : kk * 30),
        !bien,
      ),
    );
  }

  // Cuchillo fijo: se levanta cuando llega una línea y baja al pulsar J
  const proxima = v.notas.some(
    (n, i) =>
      v.teclas[i] === 'accion' &&
      n.juicio === null &&
      n.pulso - v.pulso < 0.5 &&
      n.pulso - v.pulso > -0.2,
  );
  const corta = v.desdePulsacion < 0.12 && v.ultimaTecla === 'accion';
  const yk = corta ? TABLA_Y - 4 : proxima ? TABLA_Y - 16 : TABLA_Y - 11;
  const lx = X_CUCHILLO - 1.2;
  // Brazo del chef: la mano va antes que la manga para que salga del puño
  mano(c, lx + 1.2, yk - 6.4, '#f2c19a');
  extremidad(c, 51.8, 33, lx + 1, yk - 7.6, 4, 3.1, -0.8, '#ffffff');
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
    if (!golpe.acierto) onomatopeya(c, esOlla ? 120 : 78, 28, '¡UY!', golpe.k, '#ff6b6b');
    else onomatopeya(c, esOlla ? 120 : 78, 28, esOlla ? '¡CHOF!' : '¡CHAC!', golpe.k);
  }
};

export const ramen: Escenario = {
  dibujar,
  instrucciones:
    'Pulsa J cuando cada marca de puntos pasa bajo el cuchillo. Cuando se levante la tapa de la olla, pulsa K medio pulso después.',
  aviso: (m, t, tecla) => {
    // Los cortes no tienen aviso: ya se ven llegar las líneas y un clic encima de otro corte despistaba.
    // La olla sí: la tapa tintinea un pulso antes de la K
    if (tecla === 'accion') return;
    m.tono('square', 1568, t, 0.04, 0.03);
    const o = m.tono('sine', 300, t, 0.15, 0.1);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
  },
  grabados: {
    aviso: (tecla) => (tecla === 'alterna' ? 'ramen-aviso' : undefined),
    acierto: (tecla) => (tecla === 'alterna' ? 'ramen-olla' : 'ramen-cortar'),
  },
  teclas: { accion: { texto: 'Cortar' }, alterna: { texto: 'A la olla', nota: 'A contratiempo' } },
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Cola en la puerta del restaurante!'
      : hype >= 40
        ? 'Un ramen bastante rico'
        : 'La sopa se ha quedado sin verduras',
};
