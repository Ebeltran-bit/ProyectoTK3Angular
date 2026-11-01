/**
 * Escenario difícil: Duelo de barberos.
 * Llamada y respuesta: el barbero rival (izquierda) corta un ritmo en un
 * compás y tú lo repites en el siguiente. J es un tijeretazo y K una pasada
 * de navaja. Cada acierto recorta la barba de tu cliente; un fallo le deja
 * un trasquilón.
 */
import {
  ANCHO,
  caja,
  circ,
  elip,
  fondo,
  forma,
  onomatopeya,
  poli,
  raya,
  TINTA,
  tono,
  ultimoGolpe,
} from './dibujo';
import { SonidoAviso } from '../musica';
import { DibujarEscena, Escenario, VistaEscena } from './tipos';

const INICIO = 4; // primer compás del rival, justo después de la cuenta atrás
const CICLO = 8; // compás del rival + compás tuyo
const AVISO = 4; // el rival toca cada golpe cuatro pulsos antes que tú

const P = {
  pared: '#ffd970',
  pared2: '#ffc94a',
  zocalo: '#2fb5a2',
  madera: '#c56b2e',
  espejo: '#a8ecff',
  cuero: '#ff3b4e',
  metal: '#c8d6e5',
  capa: '#ffffff',
  raya: '#2d6cff',
  piel: '#ffc79e',
  barba: '#7a3d1c',
  barba2: '#4a200c',
  pelo: '#2a1a14',
  camisa: '#ffffff',
  delantal: '#fff3d6',
  pajarita: '#ff2e4c',
};

/** Pulso en que empieza el ciclo (escucha + tu turno) en el que estamos. */
function inicioCiclo(pulso: number): number {
  return INICIO + Math.max(0, Math.floor((pulso - INICIO) / CICLO)) * CICLO;
}

function decorado(c: CanvasRenderingContext2D, t: number): void {
  // Papel pintado a rayas, zócalo y suelo de baldosas blancas y negras
  fondo(c, P.pared);
  for (let x = 0; x < ANCHO; x += 6.6) fondo(c, P.pared2, x, 0, 3, 50);
  caja(c, -2, 50, ANCHO + 4, 12, P.zocalo, 0);
  caja(c, -2, 49.4, ANCHO + 4, 1.8, P.madera, 0.3);
  fondo(c, '#ffffff', 0, 62, ANCHO, 28);
  for (let fila = 0; fila < 4; fila++)
    for (let col = 0; col < 24; col++)
      if ((col + fila) % 2) fondo(c, '#1b1830', col * 7, 62 + fila * 7, 7, 7);
  raya(c, [0, 62, ANCHO, 62], 1);
  // Poste de barbero con las rayas que suben
  caja(c, 77.4, 8, 5.2, 3, P.metal, 1);
  caja(c, 77.8, 10.6, 4.4, 25, '#ffffff', 0.5);
  c.save();
  c.beginPath();
  c.rect(77.8, 10.6, 4.4, 25);
  c.clip();
  const sube = (t * 6) % 6.6;
  for (let k = -1; k < 6; k++) {
    const y = 10.6 + k * 6.6 - sube + 6.6;
    poli(c, [77.8, y, 82.2, y - 3.3, 82.2, y - 1.3, 77.8, y + 2], k % 2 ? P.raya : P.cuero, false);
  }
  c.restore();
  caja(c, 77.8, 10.6, 4.4, 25, 'rgba(0, 0, 0, 0)', 0.5);
  caja(c, 77.4, 35, 5.2, 3, P.metal, 1);
}

/** Espejo, repisa y sillón de un puesto. ox es 0 para el rival y 80 para ti. */
function puesto(c: CanvasRenderingContext2D, ox: number): void {
  caja(c, ox + 11.7, 10, 38.3, 28.3, P.madera, 3);
  caja(c, ox + 14, 12.3, 33.7, 23.7, P.espejo, 1.6);
  raya(c, [ox + 18, 32, ox + 28, 16], 1.6, '#ffffff');
  raya(c, [ox + 23, 33, ox + 31, 21], 0.8, '#ffffff');
  caja(c, ox + 8.3, 39.6, 45, 2.6, P.madera, 0.6);
  caja(c, ox + 11.7, 32.6, 5, 7, '#28d2ef', 1);
  for (let i = 0; i < 3; i++)
    raya(c, [ox + 13 + i * 1.2, 31, ox + 13.3 + i * 1.2, 37.6], 0.6, P.pelo);
  caja(c, ox + 41.7, 34.3, 3, 5.3, '#e0306e', 0.8);
  caja(c, ox + 46, 35.6, 4.3, 4, '#ffffff', 1);
  // Sillón hidráulico
  elip(c, ox + 33.3, 78.3, 18, 2.6, 'rgba(20, 16, 25, 0.18)', 0, false);
  caja(c, ox + 25, 76, 16.7, 2.6, P.metal, 1.3);
  caja(c, ox + 31, 63.3, 4.6, 13.3, P.metal, 1);
  caja(c, ox + 18.3, 55, 31.7, 9.6, P.cuero, 3.6);
  caja(c, ox + 15.3, 35, 9.3, 28.3, P.cuero, 4);
  caja(c, ox + 45.6, 63.3, 10, 2.3, P.metal, 1);
  caja(c, ox + 44.6, 53, 11.7, 3, P.metal, 1.3);
}

/**
 * Cliente de perfil mirando a la derecha. cortes son los golpes ya dados en
 * este ciclo; devuelve la punta de la barba, donde trabaja el barbero.
 */
function cliente(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  cortes: number,
  trasquilon: boolean,
): { px: number; py: number } {
  // Capa a rayas
  const capa = (p: Path2D) => {
    p.moveTo(x - 5.7, y + 8.3);
    p.quadraticCurveTo(x - 14, y + 20, x - 12, y + 28.6);
    p.lineTo(x + 22, y + 28.6);
    p.quadraticCurveTo(x + 20.6, y + 16, x + 7.3, y + 8.3);
  };
  forma(c, capa, P.capa, 20);
  c.save();
  const recorte = new Path2D();
  capa(recorte);
  recorte.closePath();
  c.clip(recorte);
  for (let k = -12; k < 25; k += 4.3)
    raya(c, [x + k, y + 8.3, x + k + 3.6, y + 29.6], 0.8, tono(P.raya, 0.15));
  c.restore();
  caja(c, x - 3.6, y + 6.6, 10, 2.6, P.capa, 1.3);
  // Piernas y zapato
  caja(c, x + 16.6, y + 25, 12, 4.3, '#5a35d6', 2);
  elip(c, x + 30.6, y + 28, 3.6, 2, P.pelo);
  // Cabeza con la nariz hacia la derecha
  forma(
    c,
    (p) => {
      p.moveTo(x - 6.3, y - 1.3);
      p.bezierCurveTo(x - 6.6, y - 10.6, x + 7.6, y - 12.3, x + 8.6, y - 3.6);
      p.lineTo(x + 9, y - 2.3);
      p.quadraticCurveTo(x + 12, y - 0.3, x + 9.3, y + 0.6);
      p.bezierCurveTo(x + 9, y + 5.6, x + 0.6, y + 8.3, x - 3.6, y + 5.6);
      p.bezierCurveTo(x - 6.3, y + 4, x - 6.6, y + 1.3, x - 6.3, y - 1.3);
    },
    P.piel,
    14,
  );
  // Pelo del mismo color que la barba, oreja y ojo cerrado
  forma(
    c,
    (p) => {
      p.moveTo(x - 6.6, y - 0.3);
      p.bezierCurveTo(x - 8.3, y - 10, x + 5, y - 13.3, x + 8.3, y - 5.6);
      p.bezierCurveTo(x + 3.6, y - 8.3, x - 1.3, y - 7.3, x - 3.3, y - 2.3);
      p.lineTo(x - 4.6, y + 1);
    },
    P.barba,
    6,
  );
  elip(c, x - 2, y - 0.3, 1.6, 2.3, tono(P.piel, -0.15));
  c.beginPath();
  c.arc(x + 5, y - 2.6, 1.2, 0.15 * Math.PI, 0.85 * Math.PI);
  c.lineWidth = 0.6;
  c.stroke();
  c.lineWidth = 1.15;
  raya(c, [x + 3.3, y - 5, x + 6.6, y - 5.3], 0.9, P.barba2);

  // Barba larga que cuelga sobre la capa: cada corte la acorta
  const largo = 19.6 - cortes * 3;
  const px = x + 12.6;
  const py = y + 3.6 + largo;
  const barba = (p: Path2D) => {
    p.moveTo(x - 4.3, y - 1.6);
    p.quadraticCurveTo(x - 0.6, y + 2.3, x + 4.3, y + 1.6);
    p.quadraticCurveTo(x + 7.6, y + 1, x + 9, y + 2);
    p.bezierCurveTo(x + 12.6, y + 5, px + 1, py - largo * 0.5, px + 0.6, py - 1);
    if (cortes) {
      p.lineTo(px - 0.3, py + 0.3);
      p.lineTo(px - 7.6, py + 0.3);
    } else {
      for (let k = 0; k < 4; k++)
        p.quadraticCurveTo(px - k * 2 + 0.6, py + 2.3, px - (k + 1) * 2, py + 0.3);
    }
    p.bezierCurveTo(px - 10, py - largo * 0.4, x - 1, y + 10.6, x - 4.3, y + 5.6);
    p.quadraticCurveTo(x - 6, y + 1.6, x - 4.3, y - 1.6);
  };
  forma(c, barba, P.barba, 12);
  c.save();
  const recorteBarba = new Path2D();
  barba(recorteBarba);
  recorteBarba.closePath();
  c.clip(recorteBarba);
  for (let k = 0; k < 7; k++) {
    const sx = x - 2.3 + k * 2;
    const sy = y + 3 + (k % 2) * 1.3;
    raya(
      c,
      [sx, sy, sx + 1.6 + k * 0.3, sy + largo * 0.55, sx + 3 + k * 0.3, sy + largo * 0.95],
      0.5,
      P.barba2,
    );
  }
  c.restore();
  if (trasquilon) {
    const ty = y + 3.6 + largo * 0.55;
    poli(
      c,
      [
        px + 1.3,
        ty - 3,
        px - 2,
        ty - 0.6,
        px - 0.3,
        ty + 0.6,
        px - 2.3,
        ty + 2.6,
        px + 1.3,
        ty + 3,
      ],
      P.capa,
    );
  }
  // Bigote y mofletes
  forma(
    c,
    (p) => {
      p.moveTo(x + 5, y + 1.3);
      p.bezierCurveTo(x + 7.6, y - 0.3, x + 10.6, y + 0.3, x + 13, y - 1.6);
      p.bezierCurveTo(x + 13.6, y + 1.3, x + 10.3, y + 3.3, x + 5.6, y + 3);
    },
    P.barba2,
    3,
  );
  elip(c, x + 3, y - 0.3, 1.5, 1, '#ff8fa3', 0, false);
  return { px, py };
}

/** Brazo como un tubo con contorno, del hombro a la mano. */
function brazo(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  raya(c, [x0, y0, x1, y1], 6);
  raya(c, [x0, y0, x1, y1], 4.2, P.camisa);
}

/** Tijeras que apuntan a la izquierda; cierre va de 0 (abiertas) a 1 (cerradas). */
function tijeras(c: CanvasRenderingContext2D, x: number, y: number, cierre: number): void {
  const abre = 0.36 * (1 - cierre) + 0.02;
  for (const s of [-1, 1]) {
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI + s * abre);
    poli(c, [0, -0.5, 10.3, -0.2, 11, 0.2, 10, 0.7, 0, 0.7], P.metal);
    c.restore();
  }
  circ(c, x, y, 0.8, '#f0c84a', false);
}

/** Navaja de afeitar: mango negro y hoja que brilla al pasar (K). */
function navaja(c: CanvasRenderingContext2D, x: number, y: number, brilla: boolean): void {
  caja(c, x - 1, y - 1, 6, 2, TINTA, 0.8);
  poli(
    c,
    [x - 1, y - 1.2, x - 9, y - 1.2, x - 9, y + 0.6, x - 1, y + 1.2],
    brilla ? '#ffffff' : P.metal,
  );
  if (brilla) {
    raya(c, [x - 10.6, y - 3, x - 12, y - 4.3], 0.6, '#ffffff');
    raya(c, [x - 11, y, x - 12.6, y], 0.6, '#ffffff');
  }
}

/** Barbero de pie mirando a la izquierda, con las manos en la punta de la barba. */
function barbero(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  chaleco: string,
  punta: { px: number; py: number },
  tijera: number,
  pasada: boolean,
): void {
  elip(c, x + 3.3, 81, 11.6, 2, 'rgba(20, 16, 25, 0.18)', 0, false);
  caja(c, x - 1, y + 33.3, 5, 22, P.pelo, 1.6);
  caja(c, x + 4.3, y + 33.3, 5, 22, tono(P.pelo, 0.12), 1.6);
  elip(c, x - 0.3, y + 55.6, 4.3, 1.8, TINTA);
  elip(c, x + 5.6, y + 55.6, 4.3, 1.8, TINTA);
  // Brazo de atrás con la navaja (K), por detrás del cuerpo
  const hx2 = punta.px + 5.6;
  const hy2 = punta.py - 6.6;
  brazo(c, x + 8.3, y + 16.6, hx2 + 2, hy2);
  navaja(c, hx2 - (pasada ? 2 : 0), hy2, pasada);
  circ(c, hx2 + 0.6, hy2, 2.1, P.piel);
  // Cuerpo: camisa, chaleco con botones y delantal
  caja(c, x - 3.6, y + 11.6, 15.3, 23.3, P.camisa, 4.3);
  poli(c, [x - 3.3, y + 14, x + 11.3, y + 14, x + 12, y + 31, x - 4, y + 31], chaleco);
  for (let i = 0; i < 3; i++) circ(c, x + 4, y + 17.6 + i * 4, 0.7, '#f0c84a', false);
  poli(c, [x - 4, y + 28.3, x + 12, y + 28.3, x + 11, y + 42, x - 3, y + 42], P.delantal);
  caja(c, x + 5, y + 32.6, 4.3, 3.6, tono(P.delantal, -0.1), 0.6);
  // Cabeza: pelo engominado, nariz hacia el cliente y bigote de manillar
  caja(c, x + 1.3, y + 8.3, 5, 4.3, P.piel, 1.6);
  forma(
    c,
    (p) => {
      p.moveTo(x - 3, y + 1.3);
      p.bezierCurveTo(x - 3.6, y - 6.6, x + 10, y - 7.6, x + 10.3, y + 1);
      p.bezierCurveTo(x + 10.6, y + 8.3, x + 5, y + 11, x + 1, y + 10);
      p.lineTo(x - 1, y + 5.6);
      p.quadraticCurveTo(x - 4.6, y + 5, x - 3, y + 3.3);
    },
    P.piel,
    12,
  );
  forma(
    c,
    (p) => {
      p.moveTo(x - 3.3, y + 0.3);
      p.bezierCurveTo(x - 3, y - 7.6, x + 11.3, y - 7.3, x + 10.6, y + 2);
      p.lineTo(x + 8.6, y + 3.6);
      p.bezierCurveTo(x + 7.3, y - 1.3, x + 2.3, y - 2.3, x - 3.3, y + 0.3);
    },
    P.pelo,
    6,
  );
  raya(c, [x + 3, y - 3.6, x + 5.6, y - 1], 0.5, tono(P.pelo, 0.35));
  elip(c, x + 7.3, y + 4, 1.2, 1.6, tono(P.piel, -0.15));
  elip(c, x + 1, y + 3, 0.8, tijera > 0.5 ? 0.3 : 1, TINTA, 0, false);
  raya(c, [x - 0.6, y + 0.6, x + 2.3, y + 0.3], 0.7);
  forma(
    c,
    (p) => {
      p.moveTo(x - 2.3, y + 6);
      p.bezierCurveTo(x - 5, y + 5, x - 5.6, y + 3, x - 7, y + 4);
      p.bezierCurveTo(x - 5.6, y + 7.6, x - 1, y + 7.6, x + 1, y + 6.3);
    },
    P.pelo,
    2,
  );
  poli(c, [x + 0.6, y + 13, x - 2.3, y + 11.3, x - 2.3, y + 15], P.pajarita);
  poli(c, [x + 0.6, y + 13, x + 3.6, y + 11.3, x + 3.6, y + 15], P.pajarita);
  // Brazo de delante con las tijeras justo en la punta de la barba (J)
  const hx = punta.px + 7.3;
  const hy = punta.py - 0.3;
  brazo(c, x - 0.6, y + 17.3, hx + 1.6, hy);
  tijeras(c, hx - 1, hy, tijera);
  circ(c, hx + 0.6, hy + 0.3, 2.1, P.piel);
}

/** Cartel del turno: «Escucha…» sobre el rival o «¡Tu turno!» sobre ti. */
function cartel(c: CanvasRenderingContext2D, x: number, texto: string, color: string): void {
  c.save();
  c.font = '900 5px "Arial Black", system-ui, sans-serif';
  const w = c.measureText(texto).width + 6;
  caja(c, x - w / 2, 2.5, w, 7.4, color, 3.7);
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, x, 6.4);
  c.restore();
}

/** Golpes del rival en este ciclo: los mismos que tú tienes que dar, cuatro pulsos antes. */
function golpesRival(v: VistaEscena, ciclo: number): { pulso: number; k: boolean }[] {
  return v.notas
    .map((n, i) => ({ pulso: n.pulso - AVISO, k: v.teclas[i] === 'alterna' }))
    .filter((g) => g.pulso >= ciclo && g.pulso < ciclo + AVISO);
}

const dibujar: DibujarEscena = (c, v) => {
  const t = Math.max(0, v.segundos);
  decorado(c, t);
  const ciclo = inicioCiclo(v.pulso);
  const tuTurno = v.pulso >= ciclo + AVISO;
  puesto(c, 0);
  puesto(c, 80);

  // Rival: corta en su compás y, en el tuyo, espera con la barba ya recortada
  const rival = golpesRival(v, ciclo);
  const hechos = rival.filter((g) => v.pulso >= g.pulso);
  const ahora = hechos.find((g) => v.pulso - g.pulso < 0.3);
  const cierreRival = ahora && !ahora.k ? Math.sin(((v.pulso - ahora.pulso) / 0.3) * Math.PI) : 0;
  // Puntos del patrón en el espejo del rival: blancos para J, amarillos para K
  hechos.forEach((g) =>
    circ(c, 20 + (g.pulso - ciclo) * 7, 16, g.k ? 1.8 : 1.4, g.k ? '#ffc93c' : '#ffffff'),
  );
  const puntaRival = cliente(c, 31.6, 38.3, hechos.length, false);
  barbero(c, 66.6, 25, '#e0306e', puntaRival, cierreRival, !!ahora?.k);

  // Tú: cada nota de este ciclo ya juzgada es un corte; si falló, trasquilón
  const mias = v.notas
    .map((n, i) => ({ ...n, k: v.teclas[i] === 'alterna' }))
    .filter((n) => n.pulso >= ciclo + AVISO && n.pulso < ciclo + CICLO && n.juicio !== null);
  const buenas = mias.filter((n) => n.juicio !== 'miss').length;
  mias.forEach((n) =>
    circ(
      c,
      100 + (n.pulso - ciclo - AVISO) * 7,
      16,
      n.k ? 1.8 : 1.4,
      n.juicio === 'miss' ? '#ff6b6b' : '#7cf2c0',
    ),
  );
  const puntaMia = cliente(
    c,
    111.6,
    38.3,
    buenas,
    mias.some((n) => n.juicio === 'miss'),
  );
  const pulsando = v.desdePulsacion < 0.18;
  const cierre =
    pulsando && v.ultimaTecla === 'accion' ? Math.sin((v.desdePulsacion / 0.18) * Math.PI) : 0;
  barbero(c, 146.6, 25, '#5a35d6', puntaMia, cierre, pulsando && v.ultimaTecla === 'alterna');

  if (v.pulso >= INICIO - 0.5)
    cartel(
      c,
      tuTurno ? 120 : 58,
      tuTurno ? '¡Tu turno!' : 'Escucha…',
      tuTurno ? '#ff3b4e' : '#1f9583',
    );
  if (ahora) onomatopeya(c, 50, 28, ahora.k ? '¡ZIS!' : '¡CHAS!', (v.pulso - ahora.pulso) / 0.6);
  const golpe = ultimoGolpe(v);
  if (golpe) {
    const texto = !golpe.acierto
      ? '¡UY!'
      : v.teclas[golpe.indice] === 'alterna'
        ? '¡ZIS!'
        : '¡CHAS!';
    onomatopeya(c, 100, 31, texto, golpe.k, golpe.acierto ? '#fff36b' : '#ff6b6b');
  }
};

/** Tijeretazo: un chasquido agudo y metálico. Navaja: un siseo más largo. */
const corte: SonidoAviso = (m, t, tecla) => {
  if (tecla === 'accion') {
    m.ruido(t, 0.05, 0.12, 'highpass', 6000);
    m.tono('square', 2200, t, 0.025, 0.03);
  } else {
    m.ruido(t, 0.12, 0.14, 'bandpass', 2600);
    m.tono('triangle', 520, t, 0.06, 0.05);
  }
};

export const barberia: Escenario = {
  dibujar,
  instrucciones:
    'Llamada y respuesta. El barbero rival corta un ritmo y tú lo repites justo en el compás siguiente. J es un tijeretazo y K una pasada de navaja. Los puntos de su espejo te recuerdan el patrón: blancos para J y amarillos para K.',
  aviso: corte,
  mensajeFinal: (hype) =>
    hype >= 70
      ? '¡Las barbas mejor recortadas de la ciudad!'
      : hype >= 40
        ? 'Un buen arreglo, con algún trasquilón'
        : 'Tu cliente se ha ido con media barba',
};
