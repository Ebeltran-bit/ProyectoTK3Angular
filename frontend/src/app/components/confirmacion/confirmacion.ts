import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

/**
 * Ventana para confirmar una acción que no se puede deshacer (generar el cuadro,
 * elegir el ganador a mano). Sustituye al confirm() del navegador, que no se puede
 * decorar, para que el aviso tenga el estilo Pop Ritmo del resto de la aplicación.
 * La pantalla que la usa decide cuándo enseñarla con un @if.
 *
 * Usa el <dialog> nativo con showModal(): el navegador ya bloquea la página de
 * debajo, mantiene el foco dentro y avisa al pulsar Escape.
 */
@Component({
  selector: 'app-confirmacion',
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion implements OnDestroy {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
  readonly textoAceptar = input('Aceptar');

  readonly aceptar = output<void>();
  readonly cancelar = output<void>();

  private readonly ventana = viewChild.required<ElementRef<HTMLDialogElement>>('ventana');
  private readonly botonCancelar =
    viewChild.required<ElementRef<HTMLButtonElement>>('botonCancelar');

  /** Botón que abrió la ventana, para devolverle el foco al cerrarla. */
  private readonly focoAnterior = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => {
      this.ventana().nativeElement.showModal();
      // El foco empieza en «Cancelar»: así un Enter de más no confirma algo irreversible
      this.botonCancelar().nativeElement.focus();
    });
  }

  /** La pantalla la quita con su @if: el foco vuelve al botón que la abrió. */
  ngOnDestroy(): void {
    this.focoAnterior?.focus();
  }

  /** Un clic en el velo (fuera de la tarjeta) cuenta como cancelar. */
  protected alPulsar(evento: MouseEvent): void {
    if (evento.target === this.ventana().nativeElement) {
      this.cancelar.emit();
    }
  }
}
