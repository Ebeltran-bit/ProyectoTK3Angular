import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';

import { ESCENARIOS } from '../../juego/escenarios';
import { ANCHO, preparar, TINTA } from '../../juego/escenarios/dibujo';
import { DibujarEscena } from '../../juego/escenarios/tipos';
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
import { Cancion, CancionResumen, NOMBRE_NIVEL } from '../../models/cancion';
import { CancionesService } from '../../services/canciones.service';
import { mensajeError } from '../../services/mensaje-error';

type Fase = 'elegir' | 'preparada' | 'jugando' | 'resultado';

const TEXTO_JUICIO: Record<Juicio, string> = {
  perfect: 'PERFECT!',
  great: 'GREAT!',
  miss: 'MISS!',
};

/**
 * Pantalla de práctica del duelo de ritmo (etapa 3).
 * Junta las piezas: pide la canción a la API, hace sonar la música, recoge las
 * teclas y dibuja el escenario. Las reglas están en juego/evaluacion.ts.
 */
@Component({
  selector: 'app-practica',
  templateUrl: './practica.html',
  styleUrl: './practica.css',
})
export class Practica implements OnInit, OnDestroy {
  private readonly servicio = inject(CancionesService);
  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly canciones = signal<CancionResumen[]>([]);
  protected readonly cancion = signal<Cancion | null>(null);
  protected readonly fase = signal<Fase>('elegir');
  protected readonly marcador = signal<Marcador>(marcadorInicial());
  protected readonly juicio = signal<{ texto: string; tipo: Juicio; vez: number } | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreNivel = NOMBRE_NIVEL;

  private audio: AudioContext | null = null;
  private musica: Musica | null = null;
  private partida: Partida | null = null;
  /** Instante (en segundos del AudioContext) en que empieza la canción. */
  private inicio = 0;
  private ultimaPulsacion = -Infinity;
  private animacion = 0;

  ngOnInit(): void {
    this.cargar();
    this.animacion = requestAnimationFrame(this.fotograma);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animacion);
    this.musica?.parar();
    this.audio?.close();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.canciones.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  elegir(id: string): void {
    this.error.set(null);
    this.servicio.obtener(id).subscribe({
      next: (c) => {
        this.cancion.set(c);
        this.aviso.set(null);
        this.fase.set('preparada');
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  volverALaLista(): void {
    this.cancelar(null);
    this.cancion.set(null);
    this.fase.set('elegir');
  }

  /** El audio solo puede arrancar después de un clic del usuario (norma de los navegadores). */
  async jugar(): Promise<void> {
    const c = this.cancion();
    if (!c) return;
    this.audio ??= new AudioContext();
    await this.audio.resume();
    this.musica?.parar();
    this.musica = new Musica(this.audio);
    this.inicio = this.audio.currentTime + 0.3;
    this.partida = crearPartida(
      c.notas.map((n) => ({ ms: pulsoAMs(n.pulso, c.bpm), tecla: n.tecla })),
    );
    this.musica.programar(c, this.inicio);
    this.ultimaPulsacion = -Infinity;
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
    const r = pulsar(this.partida, ms, tecla);
    this.partida = r.partida;
    this.ultimaPulsacion = this.audio.currentTime;
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
    const escena: DibujarEscena | undefined = ESCENARIOS[cancion?.escenario ?? 'puerto'];
    if (!lienzo || !c || !escena) return;
    preparar(c);

    if (this.fase() !== 'jugando' || !cancion || !this.partida || !this.audio) {
      // Escena de fondo en reposo, sin notas
      const s = performance.now() / 1000;
      escena(c, {
        segundos: s,
        pulso: (s * (cancion?.bpm ?? 88)) / 60,
        notas: [],
        desdePulsacion: Infinity,
      });
      return;
    }

    const ms = this.msCancion();
    const cierre = cerrarNotasPasadas(this.partida, ms);
    if (cierre.fallos > 0) {
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
      desdePulsacion: this.audio.currentTime - this.ultimaPulsacion,
    });
    if (pulso >= 0 && pulso < cancion.cuenta_atras) this.cuentaAtras(c, Math.floor(pulso) + 1);
    if (pulso > cancion.fin + 1) this.fase.set('resultado');
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

  protected mensajeFinal(m: Marcador): string {
    if (m.hype >= 70) return '¡El puerto entero aplaude!';
    if (m.hype >= 40) return 'Las gaviotas están contentas';
    return 'Las gaviotas se han ido a otro muelle';
  }
}
