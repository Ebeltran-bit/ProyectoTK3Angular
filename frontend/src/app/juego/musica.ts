/**
 * Música del duelo generada con la Web Audio API: no hay archivos de audio.
 *
 * Todo se programa por adelantado sobre el reloj del AudioContext, el mismo
 * reloj con el que se juzgan las pulsaciones. Así la música y el juicio
 * nunca se desfasan aunque la pantalla vaya a tirones.
 */
import { Cancion, Pista } from '../models/cancion';
import type { Premio } from './evaluacion';
import { Sonidos } from './sonidos';
import { INSTRUMENTOS_DE_RELLENO, RELLENO_SIN_NOTA, SUBIDA_AVISOS, SUBIDA_MUSICA } from './reglas';
import { Volumen } from './volumen';

/** Sonido que avisa de una nota que llega. Lo define cada escenario. */
export type SonidoAviso = (m: Musica, t: number, tecla: 'accion' | 'alterna') => void;

/** Altura MIDI a frecuencia: 69 es el La de 440 Hz y cada número es un semitono. */
export function frecuencia(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Cuánto se sube todo después del compresor. Sin esto la música sonaba floja en portátiles;
 * con 2,8 quedaba demasiado fuerte (pruebas de Eva del 05/11/2026), así que va a mitad de camino.
 */
const VOLUMEN_GENERAL = 1.4;

/** Cuánto de cada nota con eco va a la sala. */
const ECO = 0.22;

/**
 * Pulsos de la cuenta corta al volver de la pausa, contados desde el punto de la canción
 * donde se paró (`pulso`, con decimales). Son los pulsos enteros justo anteriores a ese punto,
 * uno por pulso del compás: así la cuenta cae en el mismo ritmo que la canción y esta sigue
 * en su sitio. Por ejemplo, parada en el pulso 10,5 con compases de 4: 7, 8, 9 y 10.
 */
export function pulsosCuentaAlVolver(pulso: number, pulsosPorCompas: number): number[] {
  const ultimo = Math.ceil(pulso) - 1;
  return Array.from({ length: pulsosPorCompas }, (_, i) => ultimo - pulsosPorCompas + 1 + i);
}

/**
 * Volumen relativo de una nota de la música. Las notas de relleno (maraca, platillos, bajo…)
 * que caen a contratiempo donde no hay nota que pulsar suenan más flojas; todo lo demás, igual.
 * `pulso` es el pulso de la canción (el mismo que el de las notas del juego).
 */
export function volumenEnLaMezcla(
  instrumento: string,
  pulso: number,
  pulsosConNota: ReadonlySet<number>,
): number {
  const relleno = (INSTRUMENTOS_DE_RELLENO as readonly string[]).includes(instrumento);
  if (!relleno || Number.isInteger(pulso) || pulsosConNota.has(pulso)) return 1;
  return RELLENO_SIN_NOTA;
}

export class Musica {
  /** Todo pasa por aquí: la barra de Música, la de Efectos y el silencio. */
  private readonly maestro: GainNode;
  private readonly salidaMusica: GainNode;
  private readonly salidaEfectos: GainNode;
  /** Los avisos de las notas van por aquí: dentro de Efectos, pero más fuertes. */
  private readonly salidaAvisos: GainNode;
  /**
   * Por dónde salen los sonidos que se crean ahora. Casi siempre es Efectos (avisos, aciertos,
   * fallos…); solo al programar las pistas de la canción y el final pasa a Música.
   */
  private salida: GainNode;
  /**
   * Eco de sala para los instrumentos melódicos: la música suena menos "seca". Hay un envío
   * por barra, así la barra de Música al 0 % también calla el eco de la música.
   */
  private readonly salaMusica: GainNode;
  private readonly salaEfectos: GainNode;
  private fuentes: AudioScheduledSourceNode[] = [];

  constructor(
    private readonly ctx: AudioContext,
    private readonly sonidos: Sonidos | null = null,
  ) {
    // Cadena de salida: compresor → subida de volumen → limitador.
    // El compresor iguala los golpes fuertes (el bombo) con las notas suaves,
    // así se puede subir el volumen general sin que el bombo sature.
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -26;
    compresor.knee.value = 8;
    compresor.ratio.value = 6;
    compresor.attack.value = 0.003;
    compresor.release.value = 0.2;
    const subida = ctx.createGain();
    subida.gain.value = VOLUMEN_GENERAL;
    // El limitador corta lo poco que quede por encima: nunca se pasa de 0 dB
    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -6;
    limitador.knee.value = 0;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.001;
    limitador.release.value = 0.1;
    compresor.connect(subida).connect(limitador).connect(ctx.destination);
    this.maestro = ctx.createGain();
    this.maestro.connect(compresor);
    this.salidaMusica = ctx.createGain();
    this.salidaMusica.connect(this.maestro);
    this.salidaEfectos = ctx.createGain();
    this.salidaEfectos.connect(this.maestro);
    this.salidaAvisos = ctx.createGain();
    this.salidaAvisos.gain.value = SUBIDA_AVISOS;
    this.salidaAvisos.connect(this.salidaEfectos);
    this.salida = this.salidaEfectos;
    const eco = ctx.createConvolver();
    eco.buffer = this.respuestaDeSala(1.4);
    eco.connect(this.maestro);
    this.salaMusica = ctx.createGain();
    this.salaMusica.gain.value = ECO;
    this.salaMusica.connect(eco);
    this.salaEfectos = ctx.createGain();
    this.salaEfectos.gain.value = ECO;
    this.salaEfectos.connect(eco);
  }

  /** Aplica el volumen elegido en el panel de sonido. Funciona también con la música sonando. */
  ajustarVolumen(v: Volumen): void {
    this.salidaMusica.gain.value = v.musica * SUBIDA_MUSICA;
    this.salidaEfectos.gain.value = v.efectos;
    this.salaMusica.gain.value = ECO * v.musica;
    this.salaEfectos.gain.value = ECO * v.efectos;
    this.maestro.gain.value = v.silencio ? 0 : 1;
  }

  /** Lo que se cree dentro de `programar` sale por la barra de Música. */
  private comoMusica(programar: () => void): void {
    this.salida = this.salidaMusica;
    try {
      programar();
    } finally {
      this.salida = this.salidaEfectos;
    }
  }

  /** Ruido que se apaga poco a poco: imita cómo suena una nota en una sala. */
  private respuestaDeSala(segundos: number): AudioBuffer {
    const largo = Math.ceil(this.ctx.sampleRate * segundos);
    const buffer = this.ctx.createBuffer(2, largo, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const datos = buffer.getChannelData(c);
      for (let i = 0; i < largo; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / largo) ** 3;
    }
    return buffer;
  }

  /** Programa la canción entera empezando en el instante `inicio` (segundos del AudioContext). */
  programar(
    cancion: Cancion,
    inicio: number,
    aviso: SonidoAviso,
    archivoAviso?: (tecla: 'accion' | 'alterna') => string | undefined,
  ): void {
    const spb = 60 / cancion.bpm; // segundos por pulso
    // Cuenta atrás: un golpe de madera por pulso, más agudo en el primero
    for (let p = 0; p < cancion.cuenta_atras; p++) this.cuenta(inicio + p * spb, p === 0);
    // El patrón de la música se repite desde el final de la cuenta atrás hasta el final
    const { repetir_cada, pistas } = cancion.musica;
    const pulsosConNota = new Set(cancion.notas.map((n) => n.pulso));
    this.comoMusica(() => {
      for (let base = cancion.cuenta_atras; base < cancion.fin; base += repetir_cada) {
        for (const pista of pistas) {
          for (const [altura, pulso, duracion] of pista.notas) {
            if (base + pulso >= cancion.fin) continue;
            const mezcla = volumenEnLaMezcla(pista.instrumento, base + pulso, pulsosConNota);
            const p = mezcla === 1 ? pista : { ...pista, volumen: pista.volumen * mezcla };
            this.instrumento(p, altura, inicio + (base + pulso) * spb, duracion * spb);
          }
        }
      }
      // Acorde final
      for (const midi of [60, 64, 67])
        this.tono('triangle', frecuencia(midi), inicio + cancion.fin * spb, 1.2, 0.12);
    });
    // Aviso antes de cada nota; cada escenario tiene el suyo (en el puerto, el graznido)
    // Si hay un MP3 grabado para ese aviso suena él; si no, el generado por código
    for (const nota of cancion.notas) {
      this.avisar(
        inicio + (nota.pulso - cancion.aviso_antes) * spb,
        nota.tecla,
        aviso,
        archivoAviso,
        !Number.isInteger(nota.pulso),
      );
    }
  }

  /**
   * Aviso de una nota en el instante t: el MP3 grabado si lo hay, o el generado del escenario.
   * Si la nota va a contratiempo, encima suena un «ding» de timbre, el mismo en todas las
   * escenas: así se oye el ritmo un pulso antes de tocarlo.
   */
  avisar(
    t: number,
    tecla: 'accion' | 'alterna',
    aviso: SonidoAviso,
    archivoAviso?: (tecla: 'accion' | 'alterna') => string | undefined,
    aContratiempo = false,
  ): void {
    this.salida = this.salidaAvisos;
    try {
      const archivo = archivoAviso?.(tecla);
      if (!archivo || !this.grabado(archivo, t)) aviso(this, t, tecla);
      if (aContratiempo) {
        this.tono('sine', 2350, t, 0.25, 0.08, true, 0.002);
        this.tono('sine', 3520, t, 0.12, 0.03, false, 0.002);
      }
    } finally {
      this.salida = this.salidaEfectos;
    }
  }

  /** Golpe de bloque de madera de la cuenta de entrada (el primero, más agudo). */
  cuenta(t: number, primero: boolean): void {
    const hz = primero ? 1250 : 900;
    this.tono('sine', hz, t, 0.07, 0.35, false, 0.001);
    this.tono('triangle', hz * 2.3, t, 0.02, 0.12, false, 0.001);
  }

  /** Sonido del premio de combo: tintineo (bronce), arpegio con palmas (plata) o fanfarria (oro). */
  premio(premio: Premio): void {
    const t = this.ctx.currentTime;
    // Van más bajos que los avisos y son cortos, para no tapar la nota siguiente
    if (premio === 'bronce') {
      [84, 88, 91].forEach((n, i) => this.tono('square', frecuencia(n), t + i * 0.07, 0.12, 0.04));
    } else if (premio === 'plata') {
      [79, 84, 88, 91, 96].forEach((n, i) =>
        this.tono('square', frecuencia(n), t + i * 0.06, 0.14, 0.04),
      );
      this.ruido(t + 0.25, 0.5, 0.04, 'bandpass', 2500);
    } else {
      for (const [n, d, l] of [
        [72, 0, 0.12],
        [72, 0.13, 0.12],
        [72, 0.26, 0.12],
        [79, 0.4, 0.45],
      ]) {
        this.tono('sawtooth', frecuencia(n), t + d, l, 0.03);
        this.tono('square', frecuencia(n + 12), t + d, l, 0.015);
      }
      this.ruido(t + 0.4, 0.8, 0.05, 'highpass', 5000);
    }
  }

  /** Dos notas que bajan (al pausar) o suben (al continuar). */
  pausa(entrando: boolean): void {
    const t = this.ctx.currentTime;
    const [a, b] = entrando ? [76, 69] : [69, 76];
    this.tono('triangle', frecuencia(a), t, 0.1, 0.2);
    this.tono('triangle', frecuencia(b), t + 0.09, 0.16, 0.2);
  }

  /** Melodía corta al salir la tarjeta final: sube con 3 estrellas, baja con humor con 1. */
  estrellas(n: 1 | 2 | 3, t = this.ctx.currentTime): void {
    this.comoMusica(() => {
      if (n === 1) {
        [67, 66, 65].forEach((m, i) =>
          this.tono('triangle', frecuencia(m), t + i * 0.18, 0.22, 0.12, true),
        );
        this.tono('triangle', frecuencia(64), t + 0.54, 0.7, 0.12, true);
        return;
      }
      const subida = n === 3 ? [72, 76, 79, 84] : [72, 76, 79];
      subida.forEach((m, i) => this.tono('square', frecuencia(m), t + i * 0.12, 0.14, 0.05, true));
      const fin = t + subida.length * 0.12 + 0.02;
      for (const m of subida)
        this.tono('triangle', frecuencia(m), fin, n === 3 ? 1.1 : 0.8, 0.06, true);
    });
  }

  /**
   * Toca un sonido grabado en el instante t. Devuelve false si ese archivo no
   * está, para que quien llama use el sonido generado.
   */
  grabado(nombre: string, t: number, vol = 1): boolean {
    const buffer = this.sonidos?.obtener(nombre);
    if (!buffer) return false;
    const fuente = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    fuente.buffer = buffer;
    g.gain.value = vol;
    fuente.connect(g).connect(this.salida);
    fuente.start(t);
    this.fuentes.push(fuente);
    return true;
  }

  /**
   * Al terminar: la melodía de estrellas (en `desde`, cuando se apaga el acorde final) y
   * aplausos si el público acaba animado, o unas palmas flojas si no (si están grabados).
   */
  final(hype: number, estrellas: 1 | 2 | 3, desde: number): void {
    const t = this.ctx.currentTime;
    this.estrellas(estrellas, Math.max(t, desde));
    if (hype >= 70) this.grabado('ovacion', t);
    else if (hype < 40) this.grabado('final-flojo', t);
  }

  /**
   * Sonido corto al pulsar, distinto según el juicio. archivo es el MP3 del acierto, si lo hay;
   * generado, el sonido propio del escenario para cuando ese MP3 no está (las tijeras del barbero).
   * Suena ya, o en el instante t (la demostración programa así sus aciertos).
   */
  efecto(
    juicio: 'perfect' | 'great' | 'miss',
    archivo?: string,
    generado?: (m: Musica, t: number) => void,
    t = this.ctx.currentTime,
  ): void {
    if (juicio === 'miss') {
      if (!this.grabado('fallo', t, 0.8)) this.tono('sawtooth', 160, t, 0.12, 0.05);
      return;
    }
    if (archivo && this.grabado(archivo, t, juicio === 'perfect' ? 1 : 0.8)) return;
    if (generado) return generado(this, t);
    if (juicio === 'perfect') this.tono('square', 1568, t, 0.1, 0.06);
    else this.tono('square', 1175, t, 0.08, 0.05);
  }

  /** Corta todo lo programado (por ejemplo, al salir de la pantalla). */
  parar(): void {
    for (const f of this.fuentes) {
      try {
        f.stop();
      } catch {
        // ya había terminado
      }
    }
    this.fuentes = [];
  }

  private instrumento(pista: Pista, altura: number, t: number, dur: number): void {
    switch (pista.instrumento) {
      case 'bajo':
        this.tono('triangle', frecuencia(altura), t, dur, pista.volumen);
        break;
      case 'melodia':
        this.tono('square', frecuencia(altura), t, dur, pista.volumen, true);
        break;
      case 'flauta': {
        // Onda suave con un poco de vibrato
        const o = this.tono('sine', frecuencia(altura), t, dur, pista.volumen, true, 0.03);
        const vibrato = this.ctx.createOscillator();
        const cuanto = this.ctx.createGain();
        vibrato.frequency.value = 5.5;
        cuanto.gain.value = frecuencia(altura) * 0.006;
        vibrato.connect(cuanto).connect(o.frequency);
        vibrato.start(t);
        vibrato.stop(t + dur + 0.02);
        this.fuentes.push(vibrato);
        this.tono('triangle', frecuencia(altura), t, dur, pista.volumen * 0.4, true, 0.03);
        break;
      }
      case 'pulsado':
        // Cuerda pulsada (como una guitarra o un koto): ataque seco y se apaga rápido
        this.tono('triangle', frecuencia(altura), t, Math.min(dur, 0.6), pista.volumen, true);
        this.tono('square', frecuencia(altura), t, 0.05, pista.volumen * 0.3);
        break;
      case 'campana':
        // Campana: la nota y su armónico, que se apagan despacio
        this.tono('sine', frecuencia(altura), t, Math.max(dur, 1.2), pista.volumen, true);
        this.tono('sine', frecuencia(altura) * 2.76, t, 0.5, pista.volumen * 0.35, true);
        break;
      case 'acordes':
        // Fondo suave para los acordes
        this.tono('triangle', frecuencia(altura), t, dur, pista.volumen, true, 0.08);
        break;
      // Instrumentos de los arreglos de la etapa 4
      case 'marimba':
        // Madera afinada: la nota y un armónico agudo que se apaga enseguida
        this.tono(
          'sine',
          frecuencia(altura),
          t,
          Math.min(dur, 0.5) + 0.25,
          pista.volumen,
          true,
          0.002,
        );
        this.tono('sine', frecuencia(altura) * 4, t, 0.06, pista.volumen * 0.35, false, 0.001);
        break;
      case 'palmas':
        // Tres golpes de ruido muy seguidos, como varias manos a la vez
        for (const d of [0, 0.012, 0.025]) this.ruido(t + d, 0.09, pista.volumen, 'bandpass', 1400);
        break;
      case 'maraca':
        this.ruido(t, Math.min(dur, 0.06), pista.volumen, 'highpass', 7000);
        break;
      case 'fondo':
        // Acordes largos que entran despacio; la segunda onda, un poco desafinada, los ensancha
        this.tono('triangle', frecuencia(altura), t, dur, pista.volumen, true, 0.25);
        this.tono('sine', frecuencia(altura) * 1.006, t, dur, pista.volumen * 0.5, true, 0.3);
        break;
      case 'bajo_redondo':
        // La nota y su octava baja, muy suave
        this.tono('triangle', frecuencia(altura), t, dur, pista.volumen, false, 0.006);
        this.tono('sine', frecuencia(altura) / 2, t, dur, pista.volumen * 0.6, false, 0.006);
        break;
      case 'flauta_suave': {
        // Como la flauta, pero el vibrato entra poco a poco
        const o = this.tono('sine', frecuencia(altura), t, dur, pista.volumen, true, 0.04);
        const vibrato = this.ctx.createOscillator();
        const cuanto = this.ctx.createGain();
        vibrato.frequency.value = 5;
        cuanto.gain.setValueAtTime(0, t);
        cuanto.gain.linearRampToValueAtTime(frecuencia(altura) * 0.008, t + Math.min(0.3, dur));
        vibrato.connect(cuanto).connect(o.frequency);
        vibrato.start(t);
        vibrato.stop(t + dur + 0.05);
        this.fuentes.push(vibrato);
        this.tono('triangle', frecuencia(altura) * 2, t, dur, pista.volumen * 0.12, true, 0.05);
        break;
      }
      case 'bombo': {
        const o = this.tono('sine', 120, t, dur, pista.volumen);
        o.frequency.exponentialRampToValueAtTime(45, t + dur);
        break;
      }
      case 'charles':
        this.ruido(t, dur, pista.volumen);
        break;
      case 'caja':
        // Caja de batería: un golpe de ruido medio con un poco de tono
        this.ruido(t, dur, pista.volumen, 'bandpass', 1800);
        this.tono('triangle', 190, t, dur * 0.6, pista.volumen * 0.6);
        break;
    }
  }

  /**
   * Una nota con forma de onda simple que se apaga sola.
   * conEco la manda también a la sala; ataque es lo que tarda en llegar al volumen
   * (unos milisegundos evitan el chasquido del principio).
   */
  tono(
    tipo: OscillatorType,
    hz: number,
    t: number,
    dur: number,
    vol: number,
    conEco = false,
    ataque = 0.004,
  ): OscillatorNode {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, ataque + 0.01));
    o.connect(g).connect(this.salida);
    if (conEco) g.connect(this.salida === this.salidaMusica ? this.salaMusica : this.salaEfectos);
    o.start(t);
    o.stop(t + dur + 0.02);
    this.fuentes.push(o);
    return o;
  }

  /** Ruido filtrado: platillos, deslizamientos, agua... */
  ruido(
    t: number,
    dur: number,
    vol: number,
    tipoFiltro: BiquadFilterType = 'highpass',
    hz = 6000,
  ): void {
    const datos = this.ctx.createBuffer(
      1,
      Math.ceil(this.ctx.sampleRate * dur),
      this.ctx.sampleRate,
    );
    const canal = datos.getChannelData(0);
    for (let i = 0; i < canal.length; i++) canal[i] = Math.random() * 2 - 1;
    const fuente = this.ctx.createBufferSource();
    const filtro = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    filtro.type = tipoFiltro;
    filtro.frequency.value = hz;
    fuente.buffer = datos;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(filtro).connect(g).connect(this.salida);
    fuente.start(t);
    this.fuentes.push(fuente);
  }
}
