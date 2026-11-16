import { Component, computed, model } from '@angular/core';

import { volumen } from '../../juego/volumen';
import { ControlesSonido } from '../controles-sonido/controles-sonido';

/**
 * Botón redondo del altavoz, en la esquina del escenario, y su panel con las barras de
 * sonido (etapa 4, propuesta A). Se ve antes y después de tocar; durante la canción no,
 * para no tapar la escena. El reproductor lo cierra al empezar o con Esc.
 */
@Component({
  selector: 'app-boton-sonido',
  imports: [ControlesSonido],
  templateUrl: './boton-sonido.html',
  styleUrl: './boton-sonido.css',
})
export class BotonSonido {
  readonly abierto = model(false);
  protected readonly silencio = computed(() => volumen().silencio);
}
