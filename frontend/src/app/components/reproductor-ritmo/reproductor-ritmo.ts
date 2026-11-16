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

import { BotonSonido } from '../boton-sonido/boton-sonido';
import { PantallaCarga } from '../pantalla-carga/pantalla-carga';
import { RotulosPartida } from '../rotulos-partida/rotulos-partida';
import { TarjetaInicio } from '../tarjeta-inicio/tarjeta-inicio';
import { TarjetaPausa } from '../tarjeta-pausa/tarjeta-pausa';
import { ESCENARIOS } from '../../juego/escenarios';
import { preparar } from '../../juego/escenarios/dibujo';
import { Escenario, VistaEscena } from '../../juego/escenarios/tipos';
import type { Calidad, Escena3d, Motor } from '../../juego/escenas3d';
import { CON_3D } from '../../juego/escenas3d/disponibles';
import {
  Demostracion,
  demostracionDe,
  demostracionVista,
  marcarDemostracionVista,
} from '../../juego/demostracion';
import {
  cerrarNotasPasadas,
  crearPartida,
  estrellasPorHype,
  Juicio,
  Marcador,
  marcadorInicial,
  oroPorTodas,
  Partida,
  Premio,
  premioPorCombo,
  pulsar,
  pulsoAMs,
  resumirRitmo,
  ResumenRitmo,
  Tecla,
} from '../../juego/evaluacion';
import { conEspacios } from '../../juego/formato';
import { Musica, pulsosCuentaAlVolver } from '../../juego/musica';
import { SONIDOS_COMUNES, Sonidos } from '../../juego/sonidos';
import { PREMIOS_COMBO, PUNTOS, TECLAS, VENTANA_GREAT_MS } from '../../juego/reglas';
import { cambiarVolumen, volumen } from '../../juego/volumen';
import { Cancion, NOMBRE_NIVEL, NotaCancion, Pulsacion } from '../../models/cancion';

/** «demostracion»: la escena toca sola las primeras notas, antes de la cuenta (propuesta C). */
type Fase = 'preparada' | 'demostracion' | 'jugando' | 'terminada';

/**
 * Pausa de la práctica (propuesta E): «pausada» enseña la tarjeta de pausa; «volviendo» es la
 * cuenta corta antes de seguir. En las dos el reloj de la canción está parado.
 */
type EstadoPausa = 'no' | 'pausada' | 'volviendo';

/** Cuánto dura el cartel de un premio de combo, en segundos de la canción. */
const DURACION_PREMIO = 1.5;

const TEXTO_JUICIO: Record<Juicio, string> = {
  perfect: '¡PERFECT!',
  great: '¡GREAT!',
  miss: 'MISS',
};

/** Palabra del golpe que sale junto a la acción en las escenas 3D (¡Ñam!, ¡Uy!…). */
interface Palabra {
  texto: string;
  /** Posición en % del escenario. */
  x: number;
  y: number;
  fallo: boolean;
  vez: number;
}

/**
 * Calidad gráfica elegida a mano, si la hay (por ahora solo se usa en las pruebas).
 * Sin ella, el motor 3D empieza en alta y baja solo si el ordenador va justo.
 */
function calidadGuardada(): Calidad | null {
  try {
    const valor = localStorage.getItem('tk3_calidad');
    return valor === 'alta' || valor === 'media' || valor === 'baja' ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Reproductor del duelo de ritmo: hace sonar la canción, recoge las teclas,
 * dibuja el escenario y enseña el marcador mientras se juega.
 * Si el escenario tiene versión 3D (y el navegador puede con ella) se usa esa; si no, la
 * versión plana de siempre, que se queda como respaldo.
 * Lo usan Práctica y el duelo del torneo. No llama a la API: al terminar
 * avisa con las pulsaciones (salida "terminada") y la pantalla las manda.
 * Antes de empezar enseña la tarjeta de inicio y, al acabar, lo que la pantalla ponga dentro
 * de la etiqueta (ng-content), normalmente una tarjeta de resultado.
 */
@Component({
  selector: 'app-reproductor-ritmo',
  imports: [PantallaCarga, TarjetaInicio, TarjetaPausa, BotonSonido, RotulosPartida],
  templateUrl: './reproductor-ritmo.html',
  styleUrl: './reproductor-ritmo.css',
})
export class ReproductorRitmo implements OnInit, OnDestroy {
  readonly cancion = input.required<Cancion>();
  /** Texto del botón para empezar (en el duelo, "Jugar el duelo"). */
  readonly textoJugar = input('Jugar');
  /** Ronda del torneo, para la tarjeta de inicio del duelo («Semifinal»). */
  readonly ronda = input<string | null>(null);
  /** Si la canción puede empezar también pulsando J (en la práctica sí; en el duelo no, que solo vale una vez). */
  readonly conTeclaJ = input(true);
  /** Si se puede pausar (solo en la práctica: en el duelo serviría para hacer trampas). */
  readonly conPausa = input(false);
  readonly terminada = output<Pulsacion[]>();
  /** «Elegir otra canción» en la tarjeta de pausa. */
  readonly elegirOtra = output<void>();

  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly marco3d = viewChild<ElementRef<HTMLDivElement>>('marco3d');

  readonly fase = signal<Fase>('preparada');
  readonly marcador = signal<Marcador>(marcadorInicial());
  protected readonly juicio = signal<{ texto: string; tipo: Juicio; vez: number } | null>(null);
  protected readonly aviso = signal<string | null>(null);
  /** true cuando la escena 3D ya está cargada y dibujándose. */
  protected readonly en3d = signal(false);
  /** true mientras se descarga y prepara la escena 3D: se ve la cortina de carga. */
  protected readonly cargando3d = signal(false);
  /** Avance de la canción, de 0 a 100. */
  protected readonly progreso = signal(0);
  /** Número de la cuenta atrás, o null cuando no toca. */
  protected readonly cuenta = signal<number | null>(null);
  protected readonly palabra = signal<Palabra | null>(null);
  /** Última tecla pulsada, para iluminarla en la ayuda de abajo. */
  protected readonly pulsada = signal<{ tecla: Tecla; vez: number } | null>(null);
  /** Aviso de «un poco pronto» o «un poco tarde» tras un GREAT (propuesta B). */
  protected readonly desfase = signal<{ texto: string; x: number; vez: number } | null>(null);
  /** Cartel del premio de combo que se ve ahora (propuesta D). */
  protected readonly premio = signal<{ tipo: Premio; titulo: string; frase: string } | null>(null);
  /** Notas de la demostración y si ya han sonado, para la fila de círculos de arriba. */
  protected readonly notasDemo = signal<{ tecla: Tecla; sonada: boolean }[]>([]);
  protected readonly pausa = signal<EstadoPausa>('no');
  /**
   * true mientras «Empezar de nuevo» prepara la partida: la canción ya está cancelada, pero no
   * tiene que asomar la tarjeta de inicio entre medias.
   */
  protected readonly reiniciando = signal(false);
  /** Panel del botón del altavoz abierto o cerrado. */
  protected readonly panelSonido = signal(false);
  /** true si en esta partida se ha usado la pausa: la práctica no la guarda como récord. */
  readonly huboPausa = signal(false);
  /** «Tu ritmo» de la tarjeta final (propuesta F). Se calcula al acabar. */
  readonly ritmo = signal<ResumenRitmo | null>(null);
  /** Oro por tocar todas las notas seguidas en una canción de menos de 50 notas. */
  readonly oroFinal = signal(false);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  protected readonly puntosGanados = PUNTOS;
  /** Puntos con un espacio fino cada tres cifras: 12 400. */
  protected readonly puntos = computed(() => conEspacios(this.marcador().puntos));
  /** Pulsos de la cuenta de entrada (1, 2, 3, 4…), uno por cada punto bajo la cuenta. */
  protected readonly pulsosCuenta = computed(() =>
    Array.from({ length: this.cancion().cuenta_atras }, (_, i) => i + 1),
  );
  /** Escenario de la canción; si no se conoce, el puerto. */
  readonly escenario = computed<Escenario>(
    () => ESCENARIOS[this.cancion().escenario] ?? ESCENARIOS['puerto'],
  );

  private audio: AudioContext | null = null;
  private musica: Musica | null = null;
  /**
   * Audio aparte para los sonidos de la pausa y su cuenta: el de la canción está suspendido
   * (es lo que para el reloj) y mientras tanto no suena nada en él.
   */
  private audioPausa: AudioContext | null = null;
  private musicaPausa: Musica | null = null;
  /** Instantes (en el audio de la pausa) de cada golpe de la cuenta al volver, y de seguir. */
  private golpesVuelta: number[] = [];
  private reanudarEn = 0;
  /** Segundos que lleva la partida en pausa: la escena no los cuenta, así no da un salto. */
  private tiempoEnPausa = 0;
  private demo: Demostracion | null = null;
  /** Instante (en segundos del AudioContext) en que empieza la demostración. */
  private inicioDemo = 0;
  /** Hasta cuándo (en segundos del audio de la canción) se ve el cartel del premio. */
  private premioHasta = 0;
  private sonidos: Sonidos | null = null;
  private partida: Partida | null = null;
  /** Instante (en segundos del AudioContext) en que empieza la canción. */
  private inicio = 0;
  private ultimaPulsacion = -Infinity;
  private ultimaTecla: Tecla | null = null;
  /** Todas las pulsaciones de la partida: es lo único que se manda al backend. */
  private pulsaciones: Pulsacion[] = [];
  private animacion = 0;
  private arrancando = false;
  private motor: Motor | null = null;
  private escena3d: Escena3d | null = null;
  /** Instante del fotograma anterior, en segundos, para saber cuánto ha pasado. */
  private fotogramaAnterior = 0;

  constructor() {
    // Si cambia la canción (por ejemplo, un duelo que se repite), se vuelve al principio
    effect(() => {
      this.cancion();
      untracked(() => {
        this.cancelar(null);
        this.fase.set('preparada');
        void this.cargarEscena3d(this.cancion().escenario);
      });
    });
    // El volumen del panel se aplica al momento, también con la música sonando
    effect(() => {
      const v = volumen();
      untracked(() => {
        this.musica?.ajustarVolumen(v);
        this.musicaPausa?.ajustarVolumen(v);
      });
    });
  }

  ngOnInit(): void {
    this.animacion = requestAnimationFrame(this.fotograma);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animacion);
    this.soltarEscena3d();
    this.musica?.parar();
    void this.audio?.close();
    void this.audioPausa?.close();
  }

  /**
   * Prepara la versión 3D del escenario, si la tiene. La librería 3D pesa bastante, así
   * que no va en el arranque de la aplicación: se descarga aquí, la primera vez que hace
   * falta. Si algo falla (un navegador sin WebGL, por ejemplo) se sigue con la versión plana.
   */
  private async cargarEscena3d(id: string): Promise<void> {
    this.soltarEscena3d();
    this.cargando3d.set(CON_3D.includes(id));
    if (!CON_3D.includes(id)) return;
    try {
      const { ESCENAS_3D, Motor } = await import('../../juego/escenas3d');
      const marco = this.marco3d()?.nativeElement;
      // Mientras se descargaba puede haber cambiado la canción o haberse cerrado la pantalla
      if (!marco || this.cancion().escenario !== id || this.motor) return;
      const definicion = ESCENAS_3D[id];
      // Cada escena estrena lienzo: así no hereda nada de la anterior
      const lienzo = document.createElement('canvas');
      lienzo.style.cssText = 'display: block; width: 100%; height: 100%';
      marco.replaceChildren(lienzo);
      this.motor = new Motor(lienzo, definicion.motor, calidadGuardada());
      this.escena3d = definicion.crear(this.motor);
      this.motor.precalentar();
      this.en3d.set(true);
    } catch {
      this.soltarEscena3d();
    } finally {
      // La cortina se retira tanto si ha salido bien como si se sigue con la versión plana,
      // salvo si mientras tanto se ha empezado a cargar otra escena
      if (this.cancion().escenario === id) this.cargando3d.set(false);
    }
  }

  private soltarEscena3d(): void {
    this.motor?.liberar();
    this.motor = null;
    this.escena3d = null;
    this.marco3d()?.nativeElement.replaceChildren();
    this.en3d.set(false);
  }

  /** El audio solo puede arrancar después de un clic del usuario (norma de los navegadores). */
  async jugar(): Promise<void> {
    // Mientras se preparan el audio y los sonidos, o ya suena la canción, no se puede volver
    // a empezar (un doble clic o una segunda J reiniciarían la partida)
    if (this.arrancando || this.fase() === 'jugando' || this.fase() === 'demostracion') return;
    this.arrancando = true;
    try {
      await this.empezar();
    } finally {
      this.arrancando = false;
      this.reiniciando.set(false);
    }
  }

  private async empezar(): Promise<void> {
    const c = this.cancion();
    this.audio ??= new AudioContext();
    await this.audio.resume();
    // Los MP3 grabados se cargan antes de empezar; los que falten sonarán generados
    const grabados = this.escenario().grabados;
    this.sonidos ??= new Sonidos(this.audio);
    await this.sonidos.cargar(
      [
        ...SONIDOS_COMUNES,
        ...(['accion', 'alterna'] as const).flatMap((t) => [
          grabados?.aviso?.(t) ?? '',
          grabados?.acierto?.(t) ?? '',
        ]),
      ].filter((n) => n),
    );
    // Si mientras cargaba se ha cambiado de canción, esta ya no toca
    if (this.cancion() !== c) return;
    this.musica?.parar();
    this.musica = new Musica(this.audio, this.sonidos);
    this.musica.ajustarVolumen(volumen());
    this.panelSonido.set(false);
    this.aviso.set(null);
    // La primera vez que se juega cada canción, antes de la cuenta va la demostración
    const demo = demostracionDe(c);
    if (demo && !demostracionVista(c.id)) this.empezarDemostracion(demo);
    else this.empezarCancion();
  }

  /** Programa la canción y empieza la partida. Desde aquí cuentan las pulsaciones. */
  private empezarCancion(): void {
    const c = this.cancion();
    if (!this.audio || !this.musica) return;
    this.musica.parar();
    this.demo = null;
    this.notasDemo.set([]);
    this.inicio = this.audio.currentTime + 0.3;
    this.partida = crearPartida(
      c.notas.map((n) => ({ ms: pulsoAMs(n.pulso, c.bpm), tecla: n.tecla })),
    );
    this.musica.programar(c, this.inicio, this.escenario().aviso, this.escenario().grabados?.aviso);
    this.ultimaPulsacion = -Infinity;
    this.ultimaTecla = null;
    this.pulsaciones = [];
    this.marcador.set(this.partida.marcador);
    this.juicio.set(null);
    this.palabra.set(null);
    this.desfase.set(null);
    this.premio.set(null);
    this.pausa.set('no');
    this.huboPausa.set(false);
    this.ritmo.set(null);
    this.oroFinal.set(false);
    this.fase.set('jugando');
  }

  /**
   * Compás de demostración: suenan los avisos y los aciertos de las primeras notas y la escena
   * las toca sola. No crea partida ni guarda pulsaciones.
   */
  private empezarDemostracion(demo: Demostracion): void {
    if (!this.audio || !this.musica) return;
    const c = this.cancion();
    const escenario = this.escenario();
    const spb = 60 / c.bpm;
    this.demo = demo;
    this.inicioDemo = this.audio.currentTime + 0.3;
    const instante = (pulso: number) => this.inicioDemo + (pulso - demo.desde) * spb;
    for (const n of demo.notas) {
      this.musica.avisar(
        instante(n.pulso - c.aviso_antes),
        n.tecla,
        escenario.aviso,
        escenario.grabados?.aviso,
      );
      const generado = escenario.acierto
        ? (m: Musica, t: number) => escenario.acierto!(m, t, n.tecla)
        : undefined;
      this.musica.efecto(
        'perfect',
        escenario.grabados?.acierto?.(n.tecla),
        generado,
        instante(n.pulso),
      );
    }
    this.ultimaTecla = null;
    this.juicio.set(null);
    this.palabra.set(null);
    this.notasDemo.set(demo.notas.map((n) => ({ tecla: n.tecla, sonada: false })));
    this.fase.set('demostracion');
  }

  /** Acaba la demostración (o se salta) y empieza la canción. No vuelve a salir para esta canción. */
  private acabarDemostracion(): void {
    marcarDemostracionVista(this.cancion().id);
    this.empezarCancion();
  }

  @HostListener('window:keydown', ['$event'])
  protected alPulsarTecla(evento: KeyboardEvent): void {
    // Sin Ctrl, Alt ni Cmd: esas combinaciones son atajos del navegador (Ctrl+P imprime)
    const atajo = evento.ctrlKey || evento.altKey || evento.metaKey;
    if (atajo || evento.repeat) {
      if (TECLAS[evento.code] && this.fase() === 'jugando') evento.preventDefault();
      return;
    }
    // M silencia o devuelve el sonido, también con la canción sonando
    if (evento.code === 'KeyM' && !this.escribiendo(evento)) {
      cambiarVolumen({ silencio: !volumen().silencio });
      return;
    }
    if (evento.code === 'Escape' || evento.code === 'KeyP') {
      if (this.panelSonido()) this.panelSonido.set(false);
      else if (this.pausa() === 'pausada') void this.continuar();
      else if (this.fase() === 'jugando') this.pausar();
      return;
    }
    const tecla = TECLAS[evento.code];
    if (!tecla) return;
    // En la demostración, J la salta (en la práctica); el resto de teclas no cuenta
    if (this.fase() === 'demostracion') {
      evento.preventDefault();
      if (tecla === 'accion') this.saltarDemostracion();
      return;
    }
    // En la tarjeta de inicio, J hace lo mismo que el botón de jugar
    if (this.fase() === 'preparada' && tecla === 'accion' && this.conTeclaJ()) {
      if (!this.cargando3d()) {
        evento.preventDefault();
        void this.jugar();
      }
      return;
    }
    if (this.fase() !== 'jugando') return;
    evento.preventDefault();
    // En pausa (y en su cuenta) el reloj está parado: una pulsación sería un acierto gratis
    if (this.pausa() === 'no') this.pulsar(tecla);
  }

  /** true si la tecla va a un campo de texto (ahí la M es una letra, no el silencio). */
  private escribiendo(evento: KeyboardEvent): boolean {
    const destino = evento.target as HTMLElement | null;
    return !!destino?.closest(
      'textarea, [contenteditable], input:not([type=range]):not([type=checkbox])',
    );
  }

  /** En pantallas táctiles, tocar el escenario es pulsar J (o saltar la demostración). */
  protected alTocar(evento: PointerEvent): void {
    if (this.fase() === 'demostracion') {
      evento.preventDefault();
      this.saltarDemostracion();
      return;
    }
    if (this.fase() !== 'jugando' || this.pausa() !== 'no') return;
    evento.preventDefault();
    this.pulsar('accion');
  }

  /**
   * Si se cambia de pestaña el audio sigue pero la pantalla no. En la práctica se pone en
   * pausa; en el duelo se cancela, como siempre, para no contar fallos falsos.
   */
  @HostListener('document:visibilitychange')
  protected alCambiarDePestana(): void {
    if (!document.hidden) return;
    // Si se iba durante la cuenta para volver, se queda otra vez en la tarjeta de pausa
    if (this.pausa() === 'volviendo') {
      this.musicaPausa?.parar();
      this.cuenta.set(null);
      this.pausa.set('pausada');
      return;
    }
    if (this.fase() === 'jugando' && this.conPausa()) this.pausar();
    else if (this.fase() === 'jugando' || this.fase() === 'demostracion') {
      this.cancelar('Partida cancelada porque cambiaste de pestaña. Puedes volver a empezar.');
    }
  }

  /** Para la canción (propuesta E): al suspender su audio se paran la música y el reloj del juicio. */
  protected pausar(): void {
    if (!this.conPausa() || this.fase() !== 'jugando' || this.pausa() !== 'no' || !this.audio)
      return;
    this.pausa.set('pausada');
    this.huboPausa.set(true);
    void this.audio.suspend();
    // Con la pestaña oculta no hace falta el sonido de pausa
    if (!document.hidden) this.sonidosPausa()?.pausa(true);
  }

  /**
   * Vuelve a la canción tras una cuenta de un compás, alineada con su ritmo: los golpes caen
   * en los pulsos justo anteriores al punto de la pausa y la canción sigue en su sitio.
   */
  protected async continuar(): Promise<void> {
    if (this.pausa() !== 'pausada' || !this.audio) return;
    // Hasta que se programe la cuenta (después del await), nada debe reanudar la canción
    this.golpesVuelta = [];
    this.reanudarEn = Infinity;
    this.pausa.set('volviendo');
    const sonidos = this.sonidosPausa();
    const audioPausa = this.audioPausa;
    try {
      if (!sonidos || !audioPausa) throw new Error('Sin audio para la cuenta');
      await audioPausa.resume();
    } catch {
      // Si no se puede tocar la cuenta, se sigue sin ella antes que dejar la partida parada
      this.reanudar();
      return;
    }
    // Mientras tanto se puede haber cancelado o vuelto a pausar
    if (this.pausa() !== 'volviendo') return;
    const c = this.cancion();
    const spb = 60 / c.bpm;
    // El reloj de la canción está parado, así que este es el punto exacto de la pausa
    const pulso = this.msCancion() / 1000 / spb;
    const pulsos = pulsosCuentaAlVolver(pulso, c.pulsos_por_compas);
    sonidos.pausa(false);
    this.reanudarEn = audioPausa.currentTime + 0.35 + (pulso - pulsos[0]) * spb;
    this.golpesVuelta = pulsos.map((q) => this.reanudarEn - (pulso - q) * spb);
    this.golpesVuelta.forEach((t, i) => sonidos.cuenta(t, i === 0));
  }

  /** Acaba la pausa: la canción sigue donde se paró. */
  private reanudar(): void {
    this.cuenta.set(null);
    this.pausa.set('no');
    void this.audio?.resume();
    void this.audioPausa?.suspend();
  }

  /** «Empezar de nuevo» en la tarjeta de pausa. */
  protected empezarDeNuevo(): void {
    this.reiniciando.set(true);
    this.cancelar(null);
    void this.jugar();
  }

  /**
   * Salta la demostración (solo en la práctica). Los primeros instantes no cuentan: así el
   * segundo clic de un doble clic en «Jugar» no la salta sin querer.
   */
  private saltarDemostracion(): void {
    if (!this.conTeclaJ() || !this.audio) return;
    if (this.audio.currentTime < this.inicioDemo + 0.1) return;
    this.acabarDemostracion();
  }

  /** «Elegir otra canción» en la tarjeta de pausa. */
  protected salir(): void {
    this.cancelar(null);
    this.elegirOtra.emit();
  }

  /** Sonidos de la pausa, en su propio audio (se crea la primera vez que se pausa). */
  private sonidosPausa(): Musica | null {
    try {
      this.audioPausa ??= new AudioContext();
      this.musicaPausa ??= new Musica(this.audioPausa);
      this.musicaPausa.ajustarVolumen(volumen());
      void this.audioPausa.resume();
      return this.musicaPausa;
    } catch {
      return null;
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
    this.pulsada.set({ tecla, vez: (this.pulsada()?.vez ?? 0) + 1 });
    const escenario = this.escenario();
    const generado = escenario.acierto
      ? (m: Musica, t: number) => escenario.acierto!(m, t, tecla)
      : undefined;
    this.musica.efecto(r.juicio, escenario.grabados?.acierto?.(tecla), generado);
    this.mostrar(r.juicio);
    // Pronto o tarde solo en GREAT: en PERFECT ya se dio en el sitio
    if (r.juicio === 'great' && r.desfase !== null) {
      this.desfase.set({
        texto: r.desfase < 0 ? 'Un poco pronto' : 'Un poco tarde',
        // La regla va de −90 ms (izquierda) a +90 ms (derecha)
        x: 50 + (r.desfase / VENTANA_GREAT_MS) * 50,
        vez: (this.desfase()?.vez ?? 0) + 1,
      });
    } else {
      this.desfase.set(null);
    }
  }

  private mostrar(juicio: Juicio): void {
    this.marcador.set(this.partida!.marcador);
    const premio = juicio === 'miss' ? null : premioPorCombo(this.partida!.marcador.combo);
    if (premio && this.audio) {
      const frases = this.escenario().premios;
      this.premio.set({
        tipo: premio,
        titulo: `¡COMBO ×${PREMIOS_COMBO[premio]}!`,
        frase: premio === 'bronce' ? '¡Buen ritmo!' : frases[premio],
      });
      this.premioHasta = this.audio.currentTime + DURACION_PREMIO;
      this.musica?.premio(premio);
    }
    this.juicio.set({
      texto: TEXTO_JUICIO[juicio],
      tipo: juicio,
      vez: (this.juicio()?.vez ?? 0) + 1,
    });
    // En 3D la palabra del golpe es un rótulo HTML; la versión plana la dibuja en su lienzo
    const lugar = this.escena3d?.palabra;
    if (!lugar) return;
    const m = this.partida!.marcador;
    const fallo = juicio === 'miss';
    this.palabra.set({
      texto: fallo ? '¡Uy!' : lugar.aciertos[(m.perfect + m.great - 1) % lugar.aciertos.length],
      x: lugar.x,
      y: lugar.y,
      fallo,
      vez: (this.palabra()?.vez ?? 0) + 1,
    });
  }

  private cancelar(aviso: string | null): void {
    this.musica?.parar();
    this.musicaPausa?.parar();
    void this.audioPausa?.suspend();
    this.partida = null;
    this.demo = null;
    this.notasDemo.set([]);
    this.juicio.set(null);
    this.palabra.set(null);
    this.desfase.set(null);
    this.premio.set(null);
    this.cuenta.set(null);
    this.progreso.set(0);
    this.aviso.set(aviso);
    // Si estaba en pausa, el audio de la canción sigue suspendido: se reanuda al volver a jugar
    this.pausa.set('no');
    if (this.fase() === 'jugando' || this.fase() === 'demostracion') this.fase.set('preparada');
  }

  private msCancion(): number {
    return ((this.audio?.currentTime ?? 0) - this.inicio) * 1000;
  }

  /** Se llama en cada fotograma (unas 60 veces por segundo). */
  private readonly fotograma = (): void => {
    this.animacion = requestAnimationFrame(this.fotograma);
    const ahora = performance.now() / 1000;
    const paso = ahora - this.fotogramaAnterior;
    this.fotogramaAnterior = ahora;
    const cancion = this.cancion();

    // En pausa no se dibuja: la escena se queda quieta en el último fotograma
    if (this.pausa() !== 'no') {
      this.tiempoEnPausa += paso;
      if (this.pausa() === 'volviendo') this.seguirCuentaDeVuelta();
      return;
    }
    // El reloj de la escena no cuenta el tiempo en pausa: así el ambiente no da un salto
    const reloj = ahora - this.tiempoEnPausa;
    const dt = Math.min(0.1, paso);

    if (this.fase() === 'demostracion' && this.demo && this.audio) {
      this.fotogramaDemostracion(this.demo, this.audio, reloj, dt);
      return;
    }

    // Al terminar se sigue dibujando la partida (no la escena en reposo), para que los
    // personajes se queden donde acabaron y no salten a su posición inicial
    const enPartida = this.fase() === 'jugando' || this.fase() === 'terminada';
    if (!enPartida || !this.partida || !this.audio) {
      // Escena de fondo en reposo, sin notas
      this.dibujar(
        {
          segundos: reloj,
          pulso: (reloj * cancion.bpm) / 60,
          bpm: cancion.bpm,
          notas: [],
          teclas: [],
          desdePulsacion: Infinity,
          ultimaTecla: null,
        },
        reloj,
        dt,
      );
      return;
    }

    const ms = this.msCancion();
    const cierre = cerrarNotasPasadas(this.partida, ms);
    if (cierre.fallos > 0 && this.fase() === 'jugando') {
      this.partida = cierre.partida;
      this.mostrar('miss');
    }
    const pulso = (ms / 60000) * cancion.bpm;
    this.dibujar(
      {
        segundos: ms / 1000,
        pulso,
        bpm: cancion.bpm,
        notas: cancion.notas.map((n, i) => ({
          pulso: n.pulso,
          juicio: this.partida!.notas[i].juicio,
        })),
        teclas: cancion.notas.map((n) => n.tecla),
        desdePulsacion: this.audio.currentTime - this.ultimaPulsacion,
        ultimaTecla: this.ultimaTecla,
      },
      reloj,
      dt,
    );
    // Estas señales solo avisan a la pantalla cuando su valor cambia de verdad
    this.cuenta.set(pulso >= 0 && pulso < cancion.cuenta_atras ? Math.floor(pulso) + 1 : null);
    this.progreso.set(Math.round(Math.min(1, Math.max(0, pulso / cancion.fin)) * 200) / 2);
    if (this.premio() && this.audio.currentTime > this.premioHasta) this.premio.set(null);
    if (pulso > cancion.fin + 1 && this.fase() === 'jugando') this.terminar();
  };

  private terminar(): void {
    const c = this.cancion();
    const partida = this.partida!;
    const hype = partida.marcador.hype;
    this.ritmo.set(resumirRitmo(partida.notas));
    this.oroFinal.set(oroPorTodas(partida.marcador.comboMaximo, partida.notas.length));
    this.premio.set(null);
    this.desfase.set(null);
    this.fase.set('terminada');
    // La melodía de estrellas espera a que se apague el acorde final (dura 1,2 s)
    this.musica?.final(hype, estrellasPorHype(hype), this.inicio + (c.fin * 60) / c.bpm + 1.2);
    if (this.oroFinal()) this.musica?.premio('oro');
    this.terminada.emit(this.pulsaciones);
  }

  /** Durante la cuenta de vuelta: enseña el número que toca y, al acabar, reanuda la canción. */
  private seguirCuentaDeVuelta(): void {
    const t = this.audioPausa?.currentTime ?? 0;
    const sonados = this.golpesVuelta.filter((g) => g <= t).length;
    this.cuenta.set(sonados > 0 ? sonados : null);
    if (t >= this.reanudarEn) this.reanudar();
  }

  /** Un fotograma de la demostración: las notas ya pasadas salen como PERFECT. */
  private fotogramaDemostracion(
    demo: Demostracion,
    audio: AudioContext,
    reloj: number,
    dt: number,
  ): void {
    const c = this.cancion();
    const pulso = demo.desde + ((audio.currentTime - this.inicioDemo) * c.bpm) / 60;
    const sonadas = demo.notas.filter((n) => n.pulso <= pulso);
    const ultima: NotaCancion | undefined = sonadas[sonadas.length - 1];
    // La tecla de la nota se ilumina abajo en cuanto suena, como si la pulsara alguien
    if (sonadas.length > this.notasDemo().filter((n) => n.sonada).length) {
      this.notasDemo.set(demo.notas.map((n) => ({ tecla: n.tecla, sonada: n.pulso <= pulso })));
      if (ultima) this.pulsada.set({ tecla: ultima.tecla, vez: (this.pulsada()?.vez ?? 0) + 1 });
    }
    this.dibujar(
      {
        segundos: (pulso * 60) / c.bpm,
        pulso,
        bpm: c.bpm,
        notas: demo.notas.map((n) => ({
          pulso: n.pulso,
          juicio: n.pulso <= pulso ? ('perfect' as const) : null,
        })),
        teclas: demo.notas.map((n) => n.tecla),
        desdePulsacion: ultima ? ((pulso - ultima.pulso) * 60) / c.bpm : Infinity,
        ultimaTecla: ultima?.tecla ?? null,
      },
      reloj,
      dt,
    );
    if (pulso >= demo.hasta) this.acabarDemostracion();
  }

  /** Dibuja el instante `vista` en 3D si la escena está cargada y, si no, en el lienzo plano. */
  private dibujar(vista: VistaEscena, reloj: number, dt: number): void {
    const marco = this.marco3d()?.nativeElement;
    if (this.motor && this.escena3d && marco) {
      this.motor.ajustar(marco.clientWidth, marco.clientHeight);
      this.escena3d.actualizar(vista, reloj, dt);
      this.motor.pintar(dt);
      return;
    }
    const c = this.lienzo()?.nativeElement.getContext('2d');
    if (!c) return;
    preparar(c);
    this.escenario().dibujar(c, vista);
  }
}
