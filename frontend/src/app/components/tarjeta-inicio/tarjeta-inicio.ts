import { Component, input, output } from '@angular/core';

import { Escenario } from '../../juego/escenarios/tipos';
import { Cancion, NOMBRE_NIVEL } from '../../models/cancion';

/**
 * Tarjeta que sale sobre el escenario antes de empezar (propuestas A y B): nivel, título,
 * tempo, número de notas, explicación corta, qué hace cada tecla y el botón de jugar.
 * Solo enseña datos y avisa con «jugar»; quien empieza la canción es el reproductor.
 * La pantalla del duelo añade arriba quién juega contra quién y abajo el aviso del intento.
 */
@Component({
  selector: 'app-tarjeta-inicio',
  templateUrl: './tarjeta-inicio.html',
  styleUrl: './tarjeta-inicio.css',
})
export class TarjetaInicio {
  readonly cancion = input.required<Cancion>();
  readonly escenario = input.required<Escenario>();
  /** Ronda del torneo, delante del tempo («Semifinales · 124 BPM»). */
  readonly ronda = input<string | null>(null);
  /** Aviso de una partida cancelada (por ejemplo, al cambiar de pestaña). */
  readonly aviso = input<string | null>(null);
  readonly textoJugar = input('Jugar');
  /** Si se enseña la pista «o pulsa J para empezar». */
  readonly conTeclaJ = input(true);
  readonly jugar = output<void>();

  protected readonly nombreNivel = NOMBRE_NIVEL;
}
