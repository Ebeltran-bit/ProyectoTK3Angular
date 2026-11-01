/**
 * Música del duelo generada con la Web Audio API: no hay archivos de audio.
 *
 * Todo se programa por adelantado sobre el reloj del AudioContext, el mismo
 * reloj con el que se juzgan las pulsaciones. Así la música y el juicio
 * nunca se desfasan aunque la pantalla vaya a tirones.
 */
import { Cancion, Pista } from '../models/cancion';

/** Sonido que avisa de una nota que llega. Lo define cada escenario. */
export type SonidoAviso = (m: Musica, t: number, tecla: 'accion' | 'alterna') => void;

/** Altura MIDI a frecuencia: 69 es el La de 440 Hz y cada número es un semitono. */
export function frecuencia(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Musica {
  private readonly salida: GainNode;
  /** Eco de sala para los instrumentos melódicos: la música suena menos "seca". */
  private readonly sala: GainNode;
  private fuentes: AudioScheduledSourceNode[] = [];

  constructor(private readonly ctx: AudioContext) {
    // Un compresor suave evita que se sature cuando suenan muchas pistas a la vez
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -14;
    compresor.ratio.value = 3;
    compresor.connect(ctx.destination);
    this.salida = ctx.createGain();
    this.salida.connect(compresor);
    const eco = ctx.createConvolver();
    eco.buffer = this.respuestaDeSala(1.4);
    this.sala = ctx.createGain();
    this.sala.gain.value = 0.22;
    this.sala.connect(eco).connect(compresor);
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
  programar(cancion: Cancion, inicio: number, aviso: SonidoAviso): void {
    const spb = 60 / cancion.bpm; // segundos por pulso
    // Cuenta atrás: un clic por pulso, más agudo en el primero
    for (let p = 0; p < cancion.cuenta_atras; p++) {
      this.tono('square', p === 0 ? 1320 : 880, inicio + p * spb, 0.08, 0.15);
    }
    // El patrón de la música se repite desde el final de la cuenta atrás hasta el final
    const { repetir_cada, pistas } = cancion.musica;
    for (let base = cancion.cuenta_atras; base < cancion.fin; base += repetir_cada) {
      for (const pista of pistas) {
        for (const [altura, pulso, duracion] of pista.notas) {
          if (base + pulso >= cancion.fin) continue;
          this.instrumento(pista, altura, inicio + (base + pulso) * spb, duracion * spb);
        }
      }
    }
    // Aviso antes de cada nota; cada escenario tiene el suyo (en el puerto, el graznido)
    for (const nota of cancion.notas) {
      aviso(this, inicio + (nota.pulso - cancion.aviso_antes) * spb, nota.tecla);
    }
    // Acorde final
    for (const midi of [60, 64, 67])
      this.tono('triangle', frecuencia(midi), inicio + cancion.fin * spb, 1.2, 0.12);
  }

  /** Sonido corto al pulsar, distinto según el juicio. */
  efecto(juicio: 'perfect' | 'great' | 'miss'): void {
    const t = this.ctx.currentTime;
    if (juicio === 'perfect') this.tono('square', 1568, t, 0.1, 0.06);
    else if (juicio === 'great') this.tono('square', 1175, t, 0.08, 0.05);
    else this.tono('sawtooth', 160, t, 0.12, 0.05);
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
    if (conEco) g.connect(this.sala);
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
