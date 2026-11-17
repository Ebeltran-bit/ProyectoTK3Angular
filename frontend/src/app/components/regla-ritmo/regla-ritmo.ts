import { Component, computed, input } from '@angular/core';

import { COMPASES_EN_LA_REGLA, marcasDeLaRegla, rayasDeLaRegla } from '../../juego/principiante';
import { Cancion } from '../../models/cancion';

/**
 * Regla del «Modo principiante»: las notas que vienen, de derecha a izquierda, hasta la
 * línea amarilla, que es el momento de pulsar. Blancas en el pulso y rojas a contratiempo.
 *
 * Las marcas se colocan una sola vez; para moverlas, el reproductor cambia en cada
 * fotograma la variable CSS --pulso de este elemento (sin pasar por Angular, que sería
 * redibujar la plantilla 60 veces por segundo).
 */
@Component({
  selector: 'app-regla-ritmo',
  templateUrl: './regla-ritmo.html',
  styleUrl: './regla-ritmo.css',
  host: { 'aria-hidden': 'true', '[style.--pulsos]': 'pulsosVisibles()' },
})
export class ReglaRitmo {
  readonly cancion = input.required<Cancion>();

  /** Dos compases, según los pulsos por compás de la canción. */
  protected readonly pulsosVisibles = computed(
    () => COMPASES_EN_LA_REGLA * this.cancion().pulsos_por_compas,
  );
  protected readonly marcas = computed(() => marcasDeLaRegla(this.cancion().notas));
  protected readonly rayas = computed(() => {
    const c = this.cancion();
    return rayasDeLaRegla(c.cuenta_atras, c.fin, c.pulsos_por_compas);
  });
}
