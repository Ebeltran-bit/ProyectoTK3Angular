/**
 * Sonido de las pantallas de gestión (aprobado por Eva el 17/11/2026):
 * - una «burbuja» corta al pasar el ratón (o el foco del teclado) por un botón, y algo más
 *   fuerte al pulsarlo;
 * - la canción de fondo, que se para mientras hay un escenario del juego en pantalla
 *   (al abrir una canción de práctica o un duelo) y sigue al salir.
 *
 * Usa las mismas barras que el juego (juego/volumen.ts): la canción va con «Música», la
 * burbuja con «Efectos», y el silencio lo calla todo.
 * Los navegadores no dejan sonar nada hasta que la persona pulsa algo: por eso el audio se
 * crea con el primer clic o tecla.
 */
import { frecuencia } from '../juego/musica';
import { volumen } from '../juego/volumen';
import {
  ACORDES_FONDO,
  MELODIA_FONDO,
  SEGUNDOS_POR_VUELTA,
  segundoDelPulso,
} from './cancion-fondo';

/** Volumen de la canción de fondo con la barra de Música al 100 %: bajita, para no molestar. */
const VOLUMEN_FONDO = 0.5;
/** Cuánto antes de que acabe una vuelta se programa la siguiente. */
const ANTELACION = 2;

let ctx: AudioContext | null = null;
let salidaFondo: GainNode | null = null;
let salidaEfectos: GainNode | null = null;
/** Cuándo empieza la próxima vuelta de la canción (segundos del AudioContext). */
let proximaVuelta = 0;
/** Escenarios del juego abiertos ahora mismo: mientras haya alguno, la canción calla. */
let escenariosAbiertos = 0;

/** Aplica las barras de volumen. Se llama al cambiarlas (ver app.ts). */
export function aplicarVolumen(): void {
  if (!ctx || !salidaFondo || !salidaEfectos) return;
  const v = volumen();
  const callada = v.silencio || escenariosAbiertos > 0;
  // Un fundido corto evita el chasquido de cortar el sonido de golpe
  salidaFondo.gain.setTargetAtTime(callada ? 0 : v.musica * VOLUMEN_FONDO, ctx.currentTime, 0.15);
  salidaEfectos.gain.setTargetAtTime(v.silencio ? 0 : v.efectos, ctx.currentTime, 0.02);
}

/** Crea el audio con el primer gesto de la persona y arranca la canción de fondo. */
export function prepararAudio(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  ctx = new AudioContext();
  salidaFondo = ctx.createGain();
  salidaFondo.gain.value = 0;
  salidaFondo.connect(ctx.destination);
  salidaEfectos = ctx.createGain();
  salidaEfectos.connect(ctx.destination);
  aplicarVolumen();
  proximaVuelta = ctx.currentTime + 0.1;
  seguirProgramando();
  setInterval(seguirProgramando, 500);
}

/** Si a la vuelta actual le queda poco, programa la siguiente. */
function seguirProgramando(): void {
  if (!ctx || !salidaFondo) return;
  // Mientras está callada no se programa nada (no se gasta en notas que no se oyen);
  // al volver, empieza otra vuelta desde el principio
  if (volumen().silencio || escenariosAbiertos > 0) {
    proximaVuelta = 0;
    return;
  }
  // Si la pestaña estuvo dormida, no se intentan recuperar las vueltas perdidas
  if (proximaVuelta < ctx.currentTime) proximaVuelta = ctx.currentTime + 0.1;
  if (proximaVuelta - ctx.currentTime > ANTELACION) return;
  programarVuelta(proximaVuelta);
  proximaVuelta += SEGUNDOS_POR_VUELTA;
}

function programarVuelta(desde: number): void {
  const spb = segundoDelPulso(1);
  ACORDES_FONDO.forEach(([bajo, ...arriba], compas) => {
    const t = desde + compas * 4 * spb;
    nota('triangle', frecuencia(bajo - 12), t, 4 * spb, 0.09);
    // Acordes en corcheas suaves y un platillo muy flojo para marcar el paso
    for (let p = 0; p < 4; p++) {
      for (const [i, m] of arriba.entries()) {
        nota('sine', frecuencia(m), t + p * spb + i * 0.012 + (p % 2) * spb * 0.5, 0.35, 0.025);
      }
    }
    for (let c = 0; c < 8; c++)
      nota('square', 7000, t + c * spb * 0.5, 0.02, c % 2 ? 0.008 : 0.004);
  });
  for (const [m, pulso] of MELODIA_FONDO) {
    nota('sine', frecuencia(m), desde + pulso * spb, 0.5, 0.05);
    nota('sine', frecuencia(m) * 2, desde + pulso * spb, 0.15, 0.01);
  }
}

/** Una nota que se apaga sola, por la salida de la canción de fondo o por la de efectos. */
function nota(
  tipo: OscillatorType,
  hz: number,
  t: number,
  dur: number,
  vol: number,
  salida = salidaFondo,
  hasta?: number,
): void {
  if (!ctx || !salida) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(hz, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(salida);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** «Burbuja» al pasar por un botón; al pulsarlo, un poco más fuerte y más aguda. */
export function burbuja(alPulsar = false): void {
  if (!ctx || ctx.state !== 'running') return;
  const f = alPulsar ? 1.6 : 1;
  nota('sine', 520 * f, ctx.currentTime, 0.09, 0.12 * f, salidaEfectos, 980 * f);
}

/** El reproductor del juego avisa al aparecer y al irse: mientras esté, la canción calla. */
export function escenarioAbierto(): void {
  escenariosAbiertos++;
  aplicarVolumen();
}

export function escenarioCerrado(): void {
  escenariosAbiertos = Math.max(0, escenariosAbiertos - 1);
  aplicarVolumen();
}
