/**
 * Música del duelo generada con la Web Audio API: no hay archivos de audio.
 *
 * Todo se programa por adelantado sobre el reloj del AudioContext, el mismo
 * reloj con el que se juzgan las pulsaciones. Así la música y el juicio
 * nunca se desfasan aunque la pantalla vaya a tirones.
 */
import { Cancion, Pista } from '../models/cancion';

/** Altura MIDI a frecuencia: 69 es el La de 440 Hz y cada número es un semitono. */
export function frecuencia(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Musica {
  private readonly salida: GainNode;
  private fuentes: AudioScheduledSourceNode[] = [];

  constructor(private readonly ctx: AudioContext) {
    this.salida = ctx.createGain();
    this.salida.connect(ctx.destination);
  }

  /** Programa la canción entera empezando en el instante `inicio` (segundos del AudioContext). */
  programar(cancion: Cancion, inicio: number): void {
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
    // Aviso antes de cada nota: en el puerto, el graznido de la gaviota
    for (const nota of cancion.notas) {
      const t = inicio + (nota.pulso - cancion.aviso_antes) * spb;
      const o = this.tono('square', 1200, t, 0.12, 0.07);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
      this.tono('square', 1300, t + 0.14, 0.08, 0.05);
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
        this.tono('square', frecuencia(altura), t, dur, pista.volumen);
        break;
      case 'bombo': {
        const o = this.tono('sine', 120, t, dur, pista.volumen);
        o.frequency.exponentialRampToValueAtTime(45, t + dur);
        break;
      }
      case 'charles':
        this.ruido(t, dur, pista.volumen);
        break;
    }
  }

  private tono(
    tipo: OscillatorType,
    hz: number,
    t: number,
    dur: number,
    vol: number,
  ): OscillatorNode {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.salida);
    o.start(t);
    o.stop(t + dur + 0.02);
    this.fuentes.push(o);
    return o;
  }

  private ruido(t: number, dur: number, vol: number): void {
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
    filtro.type = 'highpass';
    filtro.frequency.value = 6000;
    fuente.buffer = datos;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(filtro).connect(g).connect(this.salida);
    fuente.start(t);
    this.fuentes.push(fuente);
  }
}
