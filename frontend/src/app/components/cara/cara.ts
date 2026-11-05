import { Component, input } from '@angular/core';

/**
 * Carita de los botones y avatares del tema «Pop Ritmo». Es un SVG propio:
 * un círculo blanco con ojos, mofletes y boca.
 * - 'feliz': sonríe y parpadea de vez en cuando; si el botón que la contiene
 *   (clase .con-cara) tiene el ratón encima, abre la boca.
 * - 'dormida': ojos cerrados, para los participantes desactivados.
 */
@Component({
  selector: 'app-cara',
  templateUrl: './cara.html',
  styleUrl: './cara.css',
})
export class Cara {
  /** Color del borde y de los mofletes. */
  readonly color = input('#ff6b6b');
  readonly expresion = input<'feliz' | 'dormida'>('feliz');
  /** Tamaño en píxeles. */
  readonly tam = input(96);
}
