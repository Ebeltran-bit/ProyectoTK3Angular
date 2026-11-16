import { afterNextRender, Component, ElementRef, output, viewChild } from '@angular/core';

import { ControlesSonido } from '../controles-sonido/controles-sonido';

/**
 * Tarjeta de pausa de la práctica (etapa 4, propuesta E): seguir, empezar de nuevo o elegir
 * otra canción, y el sonido. Solo enseña botones: lo que pasa al pulsarlos lo hace el reproductor.
 */
@Component({
  selector: 'app-tarjeta-pausa',
  imports: [ControlesSonido],
  templateUrl: './tarjeta-pausa.html',
  styleUrl: './tarjeta-pausa.css',
})
export class TarjetaPausa {
  readonly continuar = output<void>();
  readonly empezarDeNuevo = output<void>();
  readonly elegirOtra = output<void>();

  private readonly botonContinuar = viewChild<ElementRef<HTMLButtonElement>>('seguir');

  constructor() {
    // El foco empieza en Continuar: con Intro o espacio sigue la canción
    afterNextRender(() => this.botonContinuar()?.nativeElement.focus());
  }
}
