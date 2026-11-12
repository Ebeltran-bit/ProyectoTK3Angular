import { Component, computed, effect, input, OnDestroy, signal, untracked } from '@angular/core';

import { conEspacios } from '../../juego/formato';

/** Datos que enseña la tarjeta: sirven el marcador del navegador y el resultado del backend. */
export interface DatosResultado {
  puntos: number;
  perfect: number;
  great: number;
  miss: number;
  comboMaximo: number;
}

/**
 * Tarjeta de resultado que sale sobre el escenario al acabar la canción (propuestas D y E).
 * Solo enseña datos: arriba la cinta de la ronda o las estrellas, el mensaje, los puntos,
 * una ficha de color por juicio y la barra del Hype final. Lo que cambia en cada pantalla
 * (el estado del guardado, el rival, los botones) lo pone la pantalla dentro de la etiqueta.
 * Las medidas van en «em» y el reproductor fija la letra base, así crece con el escenario.
 */
@Component({
  selector: 'app-tarjeta-resultado',
  templateUrl: './tarjeta-resultado.html',
  styleUrl: './tarjeta-resultado.css',
})
export class TarjetaResultado implements OnDestroy {
  /** Texto de la cinta de arriba (la ronda en el duelo). */
  readonly cinta = input<string | null>(null);
  /** De 1 a 3 estrellas encima de la tarjeta (en la práctica). */
  readonly estrellas = input<number | null>(null);
  readonly titulo = input.required<string>();
  readonly resultado = input<DatosResultado | null>(null);
  readonly hype = input<number | null>(null);

  protected readonly tres = [1, 2, 3];
  /** Puntos que se ven: suben contando hasta el total. */
  protected readonly puntosVistos = signal(0);
  protected readonly conEspacios = conEspacios;
  private animacion = 0;
  /** Solo el total: así la cuenta no vuelve a empezar si llegan los mismos puntos del backend. */
  private readonly total = computed(() => this.resultado()?.puntos ?? 0);

  constructor() {
    effect(() => {
      const total = this.total();
      untracked(() => this.contarHasta(total));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animacion);
  }

  /** Sube el número poco a poco (menos de un segundo), salvo si se pide menos movimiento. */
  private contarHasta(total: number): void {
    cancelAnimationFrame(this.animacion);
    const desde = this.puntosVistos();
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || desde === total) {
      this.puntosVistos.set(total);
      return;
    }
    // Espera a que la tarjeta haya entrado (0,5 s) y cuenta durante 0,9 s
    const inicio = performance.now() + 500;
    const paso = (ahora: number): void => {
      const t = Math.min(1, Math.max(0, (ahora - inicio) / 900));
      this.puntosVistos.set(Math.round(desde + (total - desde) * t));
      if (t < 1) this.animacion = requestAnimationFrame(paso);
    };
    this.animacion = requestAnimationFrame(paso);
  }
}
