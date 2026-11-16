import { Component, computed } from '@angular/core';

import { cambiarVolumen, volumen } from '../../juego/volumen';

/**
 * Barras de Música y Efectos y el interruptor de silencio (etapa 4, propuesta A).
 * Están en el panel del botón del altavoz y en la tarjeta de pausa. Cambian el volumen
 * compartido (juego/volumen.ts), que se guarda en este navegador y aplica el reproductor.
 * Las medidas van en «em»: el tamaño lo pone quien lo contiene.
 */
@Component({
  selector: 'app-controles-sonido',
  templateUrl: './controles-sonido.html',
  styleUrl: './controles-sonido.css',
})
export class ControlesSonido {
  protected readonly musica = computed(() => Math.round(volumen().musica * 100));
  protected readonly efectos = computed(() => Math.round(volumen().efectos * 100));
  protected readonly silencio = computed(() => volumen().silencio);

  protected cambiar(cual: 'musica' | 'efectos', evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value) / 100;
    cambiarVolumen({ [cual]: valor });
  }

  protected silenciar(evento: Event): void {
    cambiarVolumen({ silencio: (evento.target as HTMLInputElement).checked });
  }
}
