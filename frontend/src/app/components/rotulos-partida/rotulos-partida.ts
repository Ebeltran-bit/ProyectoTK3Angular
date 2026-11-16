import { Component, input, output } from '@angular/core';

import { Premio, Tecla } from '../../juego/evaluacion';
import { PREMIOS_COMBO } from '../../juego/reglas';

/**
 * Rótulos de la etapa 4 que salen encima de la escena mientras se juega: el aviso de pronto
 * o tarde (propuesta B), la demostración (C), el cartel del premio de combo (D) y el botón de
 * pausa (E). Solo enseña lo que le pasa el reproductor; las medidas van en «cqw», como el
 * marcador, para que crezcan con el escenario.
 */
@Component({
  selector: 'app-rotulos-partida',
  templateUrl: './rotulos-partida.html',
  styleUrl: './rotulos-partida.css',
})
export class RotulosPartida {
  readonly desfase = input<{ texto: string; x: number; vez: number } | null>(null);
  readonly premio = input<{ tipo: Premio; titulo: string; frase: string } | null>(null);
  /** Notas de la demostración (vacío si no hay demostración). */
  readonly notasDemo = input<{ tecla: Tecla; sonada: boolean }[]>([]);
  /** Si la demostración se puede saltar (en la práctica). */
  readonly demoSaltable = input(false);
  readonly conBotonPausa = input(false);
  readonly pausar = output<void>();

  protected readonly cifra = PREMIOS_COMBO;
}
