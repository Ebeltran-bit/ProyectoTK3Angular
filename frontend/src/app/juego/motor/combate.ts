/**
 * Lógica de la lucha, sin dibujo ni teclado: solo datos y reglas.
 * Por eso se puede probar con tests (combate.spec.ts) y reutilizar con la IA.
 *
 * Cada tick: se leen las entradas, se mueven los luchadores, se comprueban
 * los golpes y se decide si acaba la ronda.
 */
import { Apariencia } from '../sprites/apariencia';
import {
  ATAQUES,
  COMBATE,
  CUERPO,
  DANIO_BLOQUEADO,
  ENERGIA_MAXIMA,
  ENERGIA_POR_GOLPE,
  ESCENARIO,
  FISICA,
  TICKS_POR_SEGUNDO,
  TipoAtaque,
  VIDA_MAXIMA,
} from './reglas';

/** Lo que quiere hacer un jugador en este tick (teclado o IA). */
export interface Entrada {
  izquierda: boolean;
  derecha: boolean;
  saltar: boolean;
  bloquear: boolean;
  /** Los golpes solo cuentan el tick en que se pulsa la tecla. */
  punetazo: boolean;
  patada: boolean;
  especial: boolean;
}

export const SIN_ENTRADA: Entrada = {
  izquierda: false,
  derecha: false,
  saltar: false,
  bloquear: false,
  punetazo: false,
  patada: false,
  especial: false,
};

export type EstadoLuchador =
  'reposo' | 'caminar' | 'salto' | 'bloqueo' | TipoAtaque | 'golpeado' | 'ko' | 'victoria';

export interface Luchador {
  nombre: string;
  apariencia: Apariencia;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 mira a la derecha, -1 a la izquierda. */
  mira: 1 | -1;
  vida: number;
  energia: number;
  estado: EstadoLuchador;
  /** Ticks que lleva en el estado actual. */
  ticks: number;
  /** Para que un mismo golpe no dé dos veces. */
  golpeAcertado: boolean;
  aturdimiento: number;
}

export type FaseCombate = 'presentacion' | 'luchando' | 'finRonda' | 'finCombate';

/** Lo que ha pasado en el último tick, para sonidos y efectos. */
export type Evento =
  | { tipo: 'golpe' | 'bloqueo'; x: number; y: number; ataque: TipoAtaque }
  | { tipo: 'ko' | 'tiempo' | 'inicioRonda' | 'finCombate' }
  | { tipo: 'ataque'; ataque: TipoAtaque };

export interface Combate {
  luchadores: [Luchador, Luchador];
  fase: FaseCombate;
  ticksFase: number;
  ronda: number;
  victorias: [number, number];
  ticksRestantes: number;
  /** Índice de quien ganó la última ronda, o null si fue empate. */
  ganadorRonda: 0 | 1 | null;
  /** Cómo acabó la última ronda. */
  motivoFin: 'ko' | 'tiempo' | null;
  ganador: 0 | 1 | null;
  eventos: Evento[];
}

export interface DatosLuchador {
  nombre: string;
  apariencia: Apariencia;
}

const TICKS_RONDA = COMBATE.segundosPorRonda * TICKS_POR_SEGUNDO;
/** Espacio que necesita un luchador tumbado detrás de los pies. */
const CUERPO_TUMBADO = 40;

function nuevoLuchador(datos: DatosLuchador, lado: 0 | 1): Luchador {
  return {
    ...datos,
    x: lado === 0 ? 100 : ESCENARIO.ancho - 100,
    y: ESCENARIO.suelo,
    vx: 0,
    vy: 0,
    mira: lado === 0 ? 1 : -1,
    vida: VIDA_MAXIMA,
    energia: 0,
    estado: 'reposo',
    ticks: 0,
    golpeAcertado: false,
    aturdimiento: 0,
  };
}

export function crearCombate(jugador: DatosLuchador, rival: DatosLuchador): Combate {
  return {
    luchadores: [nuevoLuchador(jugador, 0), nuevoLuchador(rival, 1)],
    fase: 'presentacion',
    ticksFase: 0,
    ronda: 1,
    victorias: [0, 0],
    ticksRestantes: TICKS_RONDA,
    ganadorRonda: null,
    motivoFin: null,
    ganador: null,
    eventos: [{ tipo: 'inicioRonda' }],
  };
}

export function esAtaque(estado: EstadoLuchador): estado is TipoAtaque {
  return estado === 'punetazo' || estado === 'patada' || estado === 'especial';
}

export function enSuelo(l: Luchador): boolean {
  return l.y >= ESCENARIO.suelo && l.vy >= 0;
}

/** El golpe está en su ventana de daño. */
export function golpeActivo(l: Luchador): boolean {
  if (!esAtaque(l.estado)) return false;
  const a = ATAQUES[l.estado];
  return l.ticks >= a.arranque && l.ticks < a.arranque + a.activo;
}

function cambiarEstado(l: Luchador, estado: EstadoLuchador): void {
  if (l.estado !== estado) {
    l.estado = estado;
    l.ticks = 0;
  }
}

function empezarAtaque(l: Luchador, ataque: TipoAtaque, eventos: Evento[]): void {
  l.estado = ataque;
  l.ticks = 0;
  l.golpeAcertado = false;
  if (ataque === 'especial') l.energia = 0;
  eventos.push({ tipo: 'ataque', ataque });
}

/** Mueve a un luchador según su entrada y su estado. */
export function actualizarLuchador(
  l: Luchador,
  e: Entrada,
  rival: Luchador,
  eventos: Evento[],
): void {
  l.ticks++;

  if (l.estado === 'ko' || l.estado === 'victoria') {
    // Sin control: solo cae por la gravedad
  } else if (l.estado === 'golpeado') {
    if (l.ticks >= l.aturdimiento) cambiarEstado(l, 'reposo');
  } else if (esAtaque(l.estado)) {
    const a = ATAQUES[l.estado];
    if (l.ticks >= a.arranque + a.activo + a.recuperacion) {
      cambiarEstado(l, enSuelo(l) ? 'reposo' : 'salto');
    }
  } else {
    // Libre: puede actuar
    if (e.especial && l.energia >= ENERGIA_MAXIMA && enSuelo(l)) {
      empezarAtaque(l, 'especial', eventos);
    } else if (e.patada) {
      empezarAtaque(l, 'patada', eventos);
    } else if (e.punetazo) {
      empezarAtaque(l, 'punetazo', eventos);
    } else if (enSuelo(l)) {
      const direccion = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (e.bloquear) {
        cambiarEstado(l, 'bloqueo');
        l.vx = 0;
      } else if (e.saltar) {
        cambiarEstado(l, 'salto');
        l.vy = FISICA.impulsoSalto;
        l.vx = direccion * FISICA.avanceSalto;
      } else {
        l.vx = direccion * FISICA.velocidadCaminar;
        cambiarEstado(l, direccion === 0 ? 'reposo' : 'caminar');
      }
    }
    // Siempre de cara al rival mientras está en el suelo y sin golpear
    if (enSuelo(l) && !esAtaque(l.estado)) {
      l.mira = rival.x >= l.x ? 1 : -1;
    }
  }

  // Física
  if (l.estado === 'golpeado' || l.estado === 'ko') {
    l.vx *= 0.85; // el empuje se va frenando
  } else if (enSuelo(l) && esAtaque(l.estado)) {
    l.vx = 0; // en el suelo no se avanza mientras se golpea
  }
  l.vy += enSuelo(l) && l.vy === 0 ? 0 : FISICA.gravedad;
  l.x += l.vx;
  l.y += l.vy;
  if (l.y >= ESCENARIO.suelo) {
    l.y = ESCENARIO.suelo;
    l.vy = 0;
    if (l.estado === 'salto') cambiarEstado(l, 'reposo');
    if (l.estado !== 'golpeado' && l.estado !== 'ko' && l.estado !== 'caminar') l.vx = 0;
  }
  l.x = Math.max(ESCENARIO.margen, Math.min(ESCENARIO.ancho - ESCENARIO.margen, l.x));
}

/** Comprueba si el golpe del atacante alcanza al defensor y aplica el daño. */
export function resolverGolpe(atacante: Luchador, defensor: Luchador, eventos: Evento[]): void {
  if (!golpeActivo(atacante) || atacante.golpeAcertado || defensor.estado === 'ko') return;
  const ataque = ATAQUES[atacante.estado as TipoAtaque];
  const zona = ataque.alcance;

  // Rectángulo del golpe y del cuerpo del defensor
  const golpeX1 = atacante.x + atacante.mira * zona.desde;
  const golpeX2 = atacante.x + atacante.mira * zona.hasta;
  const golpeIzq = Math.min(golpeX1, golpeX2);
  const golpeDer = Math.max(golpeX1, golpeX2);
  const golpeArriba = atacante.y - zona.arriba;
  const golpeAbajo = atacante.y - zona.abajo;
  const cuerpoIzq = defensor.x - CUERPO.mitadAncho;
  const cuerpoDer = defensor.x + CUERPO.mitadAncho;
  const cuerpoArriba = defensor.y - CUERPO.alto;
  const cuerpoAbajo = defensor.y;
  const toca =
    golpeIzq < cuerpoDer &&
    golpeDer > cuerpoIzq &&
    golpeArriba < cuerpoAbajo &&
    golpeAbajo > cuerpoArriba;
  if (!toca) return;

  atacante.golpeAcertado = true;
  const deCara = defensor.mira === -atacante.mira;
  const bloquea = defensor.estado === 'bloqueo' && deCara;
  const danio = bloquea ? Math.ceil(ataque.danio * DANIO_BLOQUEADO) : ataque.danio;

  defensor.vida = Math.max(0, defensor.vida - danio);
  atacante.energia = Math.min(ENERGIA_MAXIMA, atacante.energia + ENERGIA_POR_GOLPE.dado);
  defensor.energia = Math.min(ENERGIA_MAXIMA, defensor.energia + ENERGIA_POR_GOLPE.recibido);
  const puntoX = (Math.max(golpeIzq, cuerpoIzq) + Math.min(golpeDer, cuerpoDer)) / 2;
  const puntoY = (Math.max(golpeArriba, cuerpoArriba) + Math.min(golpeAbajo, cuerpoAbajo)) / 2;

  if (defensor.vida === 0) {
    defensor.estado = 'ko';
    defensor.ticks = 0;
    defensor.vx = atacante.mira * ataque.empuje;
    defensor.vy = -2.5;
    eventos.push({ tipo: 'golpe', x: puntoX, y: puntoY, ataque: atacante.estado as TipoAtaque });
  } else if (bloquea) {
    defensor.vx = atacante.mira * ataque.empuje * 0.5;
    eventos.push({ tipo: 'bloqueo', x: puntoX, y: puntoY, ataque: atacante.estado as TipoAtaque });
  } else {
    defensor.estado = 'golpeado';
    defensor.ticks = 0;
    defensor.aturdimiento = ataque.aturdimiento;
    defensor.vx = atacante.mira * ataque.empuje;
    eventos.push({ tipo: 'golpe', x: puntoX, y: puntoY, ataque: atacante.estado as TipoAtaque });
  }
}

/** Impide que los dos luchadores se atraviesen. */
export function separar(a: Luchador, b: Luchador): void {
  const distancia = b.x - a.x;
  const alturaParecida = Math.abs(a.y - b.y) < CUERPO.alto * 0.6;
  if (!alturaParecida || Math.abs(distancia) >= FISICA.separacionMinima) return;
  const solape = (FISICA.separacionMinima - Math.abs(distancia)) / 2;
  const signo = distancia === 0 ? (a.mira === 1 ? 1 : -1) : Math.sign(distancia);
  a.x -= signo * solape;
  b.x += signo * solape;
  const min = ESCENARIO.margen;
  const max = ESCENARIO.ancho - ESCENARIO.margen;
  // Si uno está contra la pared, el otro se aparta del todo
  if (a.x < min || a.x > max) {
    a.x = Math.max(min, Math.min(max, a.x));
    b.x = a.x + signo * FISICA.separacionMinima;
  }
  if (b.x < min || b.x > max) {
    b.x = Math.max(min, Math.min(max, b.x));
    a.x = b.x - signo * FISICA.separacionMinima;
  }
}

/**
 * Tumbado ocupa casi un cuerpo entero hacia atrás: lo apartamos de la pared
 * para que se vea, y quien sigue de pie se aparta de él.
 */
export function dejarSitioAlCaido(caido: Luchador, otro: Luchador): void {
  const min = ESCENARIO.margen + CUERPO_TUMBADO;
  const max = ESCENARIO.ancho - ESCENARIO.margen - CUERPO_TUMBADO;
  // El lado se mira antes de mover al caído, para no pasar al otro por encima
  const lado = otro.x >= caido.x ? 1 : -1;
  caido.x = Math.max(min, Math.min(max, caido.x));
  if ((otro.x - caido.x) * lado < FISICA.separacionMinima) {
    otro.x = caido.x + lado * FISICA.separacionMinima;
  }
}

function terminarRonda(c: Combate, ganador: 0 | 1 | null, motivo: 'ko' | 'tiempo'): void {
  c.fase = 'finRonda';
  c.motivoFin = motivo;
  c.ticksFase = 0;
  c.ganadorRonda = ganador;
  if (ganador !== null) {
    c.victorias[ganador]++;
    const quien = c.luchadores[ganador];
    if (quien.estado !== 'ko') {
      quien.estado = 'victoria';
      quien.ticks = 0;
    }
  }
}

function nuevaRonda(c: Combate): void {
  const [a, b] = c.luchadores;
  c.luchadores = [
    nuevoLuchador({ nombre: a.nombre, apariencia: a.apariencia }, 0),
    nuevoLuchador({ nombre: b.nombre, apariencia: b.apariencia }, 1),
  ];
  c.ronda++;
  c.fase = 'presentacion';
  c.ticksFase = 0;
  c.ticksRestantes = TICKS_RONDA;
  c.ganadorRonda = null;
  c.motivoFin = null;
  c.eventos.push({ tipo: 'inicioRonda' });
}

/** Avanza el combate un tick. */
export function actualizarCombate(c: Combate, entradas: [Entrada, Entrada]): void {
  c.eventos = [];
  c.ticksFase++;
  const [a, b] = c.luchadores;
  const controlan = c.fase === 'luchando';

  actualizarLuchador(a, controlan ? entradas[0] : SIN_ENTRADA, b, c.eventos);
  actualizarLuchador(b, controlan ? entradas[1] : SIN_ENTRADA, a, c.eventos);

  if (controlan) {
    resolverGolpe(a, b, c.eventos);
    resolverGolpe(b, a, c.eventos);
  }
  if (a.estado !== 'ko' && b.estado !== 'ko') separar(a, b);
  else dejarSitioAlCaido(a.estado === 'ko' ? a : b, a.estado === 'ko' ? b : a);

  switch (c.fase) {
    case 'presentacion':
      if (c.ticksFase >= COMBATE.ticksPresentacion) {
        c.fase = 'luchando';
        c.ticksFase = 0;
      }
      break;
    case 'luchando': {
      c.ticksRestantes--;
      const koA = a.estado === 'ko';
      const koB = b.estado === 'ko';
      if (koA || koB) {
        c.eventos.push({ tipo: 'ko' });
        terminarRonda(c, koA && koB ? null : koA ? 1 : 0, 'ko');
      } else if (c.ticksRestantes <= 0) {
        c.eventos.push({ tipo: 'tiempo' });
        terminarRonda(c, a.vida === b.vida ? null : a.vida > b.vida ? 0 : 1, 'tiempo');
      }
      break;
    }
    case 'finRonda':
      if (c.ticksFase >= COMBATE.ticksFinRonda) {
        const campeon = c.victorias.findIndex((v) => v >= COMBATE.rondasParaGanar);
        if (campeon === -1) {
          nuevaRonda(c);
        } else {
          c.fase = 'finCombate';
          c.ticksFase = 0;
          c.ganador = campeon as 0 | 1;
          c.eventos.push({ tipo: 'finCombate' });
        }
      }
      break;
    case 'finCombate':
      break;
  }
}

/** Segundos que se muestran en el marcador. */
export function segundosRestantes(c: Combate): number {
  return Math.ceil(c.ticksRestantes / TICKS_POR_SEGUNDO);
}
