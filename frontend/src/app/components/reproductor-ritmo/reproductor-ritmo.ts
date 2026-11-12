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

import { PantallaCarga } from '../pantalla-carga/pantalla-carga';
import { TarjetaInicio } from '../tarjeta-inicio/tarjeta-inicio';
import { ESCENARIOS } from '../../juego/escenarios';
import { preparar } from '../../juego/escenarios/dibujo';
import { Escenario, VistaEscena } from '../../juego/escenarios/tipos';
import type { Calidad, Escena3d, Motor } from '../../juego/escenas3d';
import { CON_3D } from '../../juego/escenas3d/disponibles';
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
import { conEspacios } from '../../juego/formato';
import { Musica } from '../../juego/musica';
import { SONIDOS_COMUNES, Sonidos } from '../../juego/sonidos';
import { PUNTOS, TECLAS } from '../../juego/reglas';
import { Cancion, NOMBRE_NIVEL, Pulsacion } from '../../models/cancion';

type Fase = 'preparada' | 'jugando' | 'terminada';

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
  imports: [PantallaCarga, TarjetaInicio],
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
  readonly terminada = output<Pulsacion[]>();

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
  }

  ngOnInit(): void {
    this.animacion = requestAnimationFrame(this.fotograma);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animacion);
    this.soltarEscena3d();
    this.musica?.parar();
    this.audio?.close();
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
    if (this.arrancando || this.fase() === 'jugando') return;
    this.arrancando = true;
    try {
      await this.empezar();
    } finally {
      this.arrancando = false;
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
    this.musica?.parar();
    this.musica = new Musica(this.audio, this.sonidos);
    this.inicio = this.audio.currentTime + 0.3;
    this.partida = crearPartida(
      c.notas.map((n) => ({ ms: pulsoAMs(n.pulso, c.bpm), tecla: n.tecla })),
    );
    this.musica.programar(c, this.inicio, this.escenario().aviso, grabados?.aviso);
    this.ultimaPulsacion = -Infinity;
    this.pulsaciones = [];
    this.marcador.set(this.partida.marcador);
    this.juicio.set(null);
    this.palabra.set(null);
    this.aviso.set(null);
    this.fase.set('jugando');
  }

  @HostListener('window:keydown', ['$event'])
  protected alPulsarTecla(evento: KeyboardEvent): void {
    const tecla = TECLAS[evento.code];
    if (!tecla) return;
    // En la tarjeta de inicio, J hace lo mismo que el botón de jugar
    if (this.fase() === 'preparada' && tecla === 'accion' && this.conTeclaJ()) {
      // Sin Ctrl, Alt ni Cmd: esas combinaciones son atajos del navegador
      const atajo = evento.ctrlKey || evento.altKey || evento.metaKey;
      if (!this.cargando3d() && !evento.repeat && !atajo) {
        evento.preventDefault();
        void this.jugar();
      }
      return;
    }
    if (this.fase() !== 'jugando') return;
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
    this.pulsada.set({ tecla, vez: (this.pulsada()?.vez ?? 0) + 1 });
    const escenario = this.escenario();
    const generado = escenario.acierto
      ? (m: Musica, t: number) => escenario.acierto!(m, t, tecla)
      : undefined;
    this.musica.efecto(r.juicio, escenario.grabados?.acierto?.(tecla), generado);
    this.mostrar(r.juicio);
  }

  private mostrar(juicio: Juicio): void {
    this.marcador.set(this.partida!.marcador);
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
    this.partida = null;
    this.juicio.set(null);
    this.palabra.set(null);
    this.cuenta.set(null);
    this.progreso.set(0);
    this.aviso.set(aviso);
    if (this.fase() === 'jugando') this.fase.set('preparada');
  }

  private msCancion(): number {
    return ((this.audio?.currentTime ?? 0) - this.inicio) * 1000;
  }

  /** Se llama en cada fotograma (unas 60 veces por segundo). */
  private readonly fotograma = (): void => {
    this.animacion = requestAnimationFrame(this.fotograma);
    const reloj = performance.now() / 1000;
    const dt = Math.min(0.1, reloj - this.fotogramaAnterior);
    this.fotogramaAnterior = reloj;
    const cancion = this.cancion();

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
    if (pulso > cancion.fin + 1 && this.fase() === 'jugando') {
      this.fase.set('terminada');
      this.musica?.final(this.partida?.marcador.hype ?? 0);
      this.terminada.emit(this.pulsaciones);
    }
  };

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
