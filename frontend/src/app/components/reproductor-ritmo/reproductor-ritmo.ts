import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { ESCENARIOS } from '../../juego/escenarios';
import { ANCHO, preparar, TINTA } from '../../juego/escenarios/dibujo';
import { Escenario } from '../../juego/escenarios/tipos';
import {
  cerrarNotasPasadas,
  crearPartida,
  Juicio,
  Marcador,
  marcadorInicial,
  Partida,
  pulsar,
  pulsoAMs,
  Tecla,
} from '../../juego/evaluacion';
import { Musica } from '../../juego/musica';
import { TECLAS } from '../../juego/reglas';
import { Cancion, Pulsacion } from '../../models/cancion';

type Fase = 'preparada' | 'jugando' | 'terminada';

const TEXTO_JUICIO: Record<Juicio, string> = {
  perfect: 'PERFECT!',
  great: 'GREAT!',
  miss: 'MISS!',
};

/**
 * Reproductor del duelo de ritmo: hace sonar la canción, recoge las teclas,
 * dibuja el escenario y enseña el marcador mientras se juega.
 * Lo usan Práctica y el duelo del torneo. No llama a la API: al terminar
 * avisa con las pulsaciones (salida "terminada") y la pantalla las manda.
 * Lo que se ve al acabar lo pone la pantalla dentro de la etiqueta (ng-content).
 */
@Component({
  selector: 'app-reproductor-ritmo',
  templateUrl: './reproductor-ritmo.html',
  styleUrl: './reproductor-ritmo.css',
})
export class ReproductorRitmo implements OnInit, OnDestroy {
  readonly cancion = input.required<Cancion>();
  /** Texto del botón para empezar (en el duelo, "Jugar el duelo"). */
  readonly textoJugar = input('Jugar');
  readonly terminada = output<Pulsacion[]>();

  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');

  readonly fase = signal<Fase>('preparada');
  readonly marcador = signal<Marcador>(marcadorInicial());
  protected readonly juicio = signal<{ texto: string; tipo: Juicio; vez: number } | null>(null);
  protected readonly aviso = signal<string | null>(null);
  /** Escenario de la canción; si no se conoce, el puerto. */
  readonly escenario = computed<Escenario>(
    () => ESCENARIOS[this.cancion().escenario] ?? ESCENARIOS['puerto'],
  );

  private audio: AudioContext | null = null;
  private musica: Musica | null = null;
  private partida: Partida | null = null;
  /** Instante (en segundos del AudioContext) en que empieza la canción. */
  private inicio = 0;
  private ultimaPulsacion = -Infinity;
  private ultimaTecla: Tecla | null = null;
  /** Todas las pulsaciones de la partida: es lo único que se manda al backend. */
  private pulsaciones: Pulsacion[] = [];
  private animacion = 0;

  constructor() {
    // Si cambia la canción (por ejemplo, un duelo que se repite), se vuelve al principio
    effect(() => {
      this.cancion();
      untracked(() => {
        this.cancelar(null);
        this.fase.set('preparada');
      });
    });
  }

  ngOnInit(): void {
    this.animacion = requestAnimationFrame(this.fotograma);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animacion);
    this.musica?.parar();
    this.audio?.close();
  }

  /** El audio solo puede arrancar después de un clic del usuario (norma de los navegadores). */
  async jugar(): Promise<void> {
    const c = this.cancion();
    this.audio ??= new AudioContext();
    await this.audio.resume();
    this.musica?.parar();
    this.musica = new Musica(this.audio);
    this.inicio = this.audio.currentTime + 0.3;
    this.partida = crearPartida(
      c.notas.map((n) => ({ ms: pulsoAMs(n.pulso, c.bpm), tecla: n.tecla })),
    );
    this.musica.programar(c, this.inicio, this.escenario().aviso);
    this.ultimaPulsacion = -Infinity;
    this.pulsaciones = [];
    this.marcador.set(this.partida.marcador);
    this.juicio.set(null);
    this.aviso.set(null);
    this.fase.set('jugando');
  }

  @HostListener('window:keydown', ['$event'])
  protected alPulsarTecla(evento: KeyboardEvent): void {
    const tecla = TECLAS[evento.code];
    if (!tecla || this.fase() !== 'jugando') return;
    evento.preventDefault();
    if (!evento.repeat) this.pulsar(tecla);
  }

  /** En pantallas táctiles, tocar el escenario es pulsar J. */
  protected alTocar(evento: PointerEvent): void {
    if (this.fase() !== 'jugando') return;
    evento.preventDefault();
    this.pulsar('accion');
  }

  /** Si se cambia de pestaña el audio sigue pero la pantalla no: se cancela para no contar fallos falsos. */
  @HostListener('document:visibilitychange')
  protected alCambiarDePestana(): void {
    if (document.hidden && this.fase() === 'jugando') {
      this.cancelar('Partida cancelada porque cambiaste de pestaña. Puedes volver a empezar.');
    }
  }

  private pulsar(tecla: Tecla): void {
    if (!this.partida || !this.audio || !this.musica) return;
    const ms = this.msCancion();
    // Sin redondear: el backend tiene que juzgar exactamente el mismo instante que el navegador
    this.pulsaciones.push({ ms, tecla });
    const r = pulsar(this.partida, ms, tecla);
    this.partida = r.partida;
    this.ultimaPulsacion = this.audio.currentTime;
    this.ultimaTecla = tecla;
    this.musica.efecto(r.juicio);
    this.mostrar(r.juicio);
  }

  private mostrar(juicio: Juicio): void {
    this.marcador.set(this.partida!.marcador);
    this.juicio.set({
      texto: TEXTO_JUICIO[juicio],
      tipo: juicio,
      vez: (this.juicio()?.vez ?? 0) + 1,
    });
  }

  private cancelar(aviso: string | null): void {
    this.musica?.parar();
    this.partida = null;
    this.juicio.set(null);
    this.aviso.set(aviso);
    if (this.fase() === 'jugando') this.fase.set('preparada');
  }

  private msCancion(): number {
    return ((this.audio?.currentTime ?? 0) - this.inicio) * 1000;
  }

  /** Se llama en cada fotograma (unas 60 veces por segundo). */
  private readonly fotograma = (): void => {
    this.animacion = requestAnimationFrame(this.fotograma);
    const lienzo = this.lienzo()?.nativeElement;
    const c = lienzo?.getContext('2d');
    const cancion = this.cancion();
    const escena = this.escenario().dibujar;
    if (!lienzo || !c) return;
    preparar(c);

    // Al terminar se sigue dibujando la partida (no la escena en reposo), para que los
    // personajes se queden donde acabaron y no salten a su posición inicial
    const enPartida = this.fase() === 'jugando' || this.fase() === 'terminada';
    if (!enPartida || !this.partida || !this.audio) {
      // Escena de fondo en reposo, sin notas
      const s = performance.now() / 1000;
      escena(c, {
        segundos: s,
        pulso: (s * cancion.bpm) / 60,
        notas: [],
        teclas: [],
        desdePulsacion: Infinity,
        ultimaTecla: null,
      });
      return;
    }

    const ms = this.msCancion();
    const cierre = cerrarNotasPasadas(this.partida, ms);
    if (cierre.fallos > 0 && this.fase() === 'jugando') {
      this.partida = cierre.partida;
      this.mostrar('miss');
    }
    const pulso = (ms / 60000) * cancion.bpm;
    escena(c, {
      segundos: ms / 1000,
      pulso,
      notas: cancion.notas.map((n, i) => ({
        pulso: n.pulso,
        juicio: this.partida!.notas[i].juicio,
      })),
      teclas: cancion.notas.map((n) => n.tecla),
      desdePulsacion: this.audio.currentTime - this.ultimaPulsacion,
      ultimaTecla: this.ultimaTecla,
    });
    if (pulso >= 0 && pulso < cancion.cuenta_atras) this.cuentaAtras(c, Math.floor(pulso) + 1);
    if (pulso > cancion.fin + 1 && this.fase() === 'jugando') {
      this.fase.set('terminada');
      this.terminada.emit(this.pulsaciones);
    }
  };

  private cuentaAtras(c: CanvasRenderingContext2D, numero: number): void {
    c.save();
    c.font = '700 20px system-ui, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 2.4;
    c.strokeStyle = TINTA;
    c.strokeText(String(numero), ANCHO / 2, 32);
    c.fillStyle = '#ffc93c';
    c.fillText(String(numero), ANCHO / 2, 32);
    c.restore();
  }
}
