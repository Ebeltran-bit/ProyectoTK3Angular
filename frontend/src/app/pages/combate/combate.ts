import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  ALTO_PANTALLA,
  ANCHO_PANTALLA,
  actualizarEfectos,
  crearEfectos,
  dibujarCombate,
  Efectos,
} from '../../juego/dibujo/dibujar-combate';
import { actualizarCombate, Combate, crearCombate, SIN_ENTRADA } from '../../juego/motor/combate';
import { TICKS_POR_SEGUNDO } from '../../juego/motor/reglas';
import { aparienciaAleatoria } from '../../juego/sprites/apariencia';
import { Teclado } from '../../juego/teclado';
import { mensajeError } from '../../services/mensaje-error';
import { Personaje, PersonajeService } from '../../services/personaje.service';

const MS_POR_TICK = 1000 / TICKS_POR_SEGUNDO;

/**
 * Pantalla del combate. Carga el personaje del usuario y mueve el bucle:
 * en cada tick lee el teclado, avanza la lógica y dibuja.
 * La lógica avanza a ritmo fijo (60 ticks/s) aunque la pantalla vaya más rápida o más lenta.
 */
@Component({
  selector: 'app-combate',
  imports: [RouterLink],
  templateUrl: './combate.html',
  styleUrl: './combate.css',
  host: {
    '(window:keydown)': 'alPulsar($event)',
    '(window:keyup)': 'alSoltar($event)',
    '(window:blur)': 'teclado.soltarTodas()',
  },
})
export class CombatePage implements OnInit {
  private readonly servicio = inject(PersonajeService);
  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly ancho = ANCHO_PANTALLA;
  protected readonly alto = ALTO_PANTALLA;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pausa = signal(false);
  /** Nombre del ganador cuando acaba el combate (para la pantalla final). */
  protected readonly ganador = signal<string | null>(null);
  protected readonly ganaJugador = signal(false);

  protected readonly teclado = new Teclado();
  private personaje: Personaje | null = null;
  private combate: Combate | null = null;
  private efectos: Efectos = crearEfectos();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let id = 0;
      let anterior = performance.now();
      let acumulado = 0;
      const bucle = (ahora: number) => {
        // Si la pestaña estuvo oculta no intentamos recuperar todo el tiempo perdido
        acumulado += Math.min(ahora - anterior, 100);
        anterior = ahora;
        while (acumulado >= MS_POR_TICK) {
          this.tick();
          acumulado -= MS_POR_TICK;
        }
        this.dibujar();
        id = requestAnimationFrame(bucle);
      };
      id = requestAnimationFrame(bucle);
      destroyRef.onDestroy(() => cancelAnimationFrame(id));
    });
  }

  ngOnInit(): void {
    this.servicio.obtener().subscribe({
      next: (personaje) => {
        this.personaje = personaje;
        this.cargando.set(false);
        this.empezar();
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  protected empezar(): void {
    if (!this.personaje) return;
    const { id_participante, nick, ...apariencia } = this.personaje;
    this.combate = crearCombate(
      { nombre: nick, apariencia },
      { nombre: 'CPU', apariencia: aparienciaAleatoria() },
    );
    this.efectos = crearEfectos();
    this.ganador.set(null);
    this.pausa.set(false);
    this.teclado.soltarTodas();
  }

  protected alPulsar(evento: KeyboardEvent): void {
    if (evento.code === 'Escape' || evento.code === 'KeyP') {
      if (this.combate && !this.ganador()) this.pausa.update((p) => !p);
      return;
    }
    if (this.teclado.pulsar(evento.code, evento.repeat)) evento.preventDefault();
  }

  protected alSoltar(evento: KeyboardEvent): void {
    this.teclado.soltar(evento.code);
  }

  private tick(): void {
    const c = this.combate;
    if (!c || this.pausa()) return;
    // Etapa 3: el rival no hace nada. En la etapa 4 su entrada vendrá de la IA.
    actualizarCombate(c, [this.teclado.leer(), SIN_ENTRADA]);
    actualizarEfectos(this.efectos, c);
    if (c.fase === 'finCombate' && c.ticksFase === 40 && c.ganador !== null) {
      this.ganador.set(c.luchadores[c.ganador].nombre);
      this.ganaJugador.set(c.ganador === 0);
    }
  }

  private dibujar(): void {
    const lienzo = this.lienzo()?.nativeElement;
    if (!lienzo || !this.combate) return;
    dibujarCombate(lienzo.getContext('2d')!, this.combate, this.efectos);
  }
}
