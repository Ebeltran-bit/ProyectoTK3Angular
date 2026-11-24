import { Component, input, output } from '@angular/core';

import { ICONOS } from '../../models/iconos';
import { IconoUsuario } from '../icono-usuario/icono-usuario';

/**
 * Rejilla de iconos para elegir uno (pedido por Eva el 24/11/2026): se usa al crear o
 * editar un participante y al registrarse. Solo avisa de lo que se elige; no llama a la API.
 */
@Component({
  selector: 'app-selector-icono',
  imports: [IconoUsuario],
  template: `
    <div class="opciones" role="group" [attr.aria-label]="titulo()">
      @for (i of iconos; track i.id) {
        <button
          type="button"
          class="opcion"
          [class.elegido]="elegido() === i.id"
          [attr.aria-pressed]="elegido() === i.id"
          [title]="i.nombre"
          [attr.aria-label]="i.nombre"
          (click)="elegir.emit(i.id)"
        >
          <app-icono-usuario [icono]="i.id" [tam]="48" />
        </button>
      }
    </div>
  `,
  styles: `
    .opciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(3.6rem, 1fr));
      gap: 0.5rem;
    }
    .opcion {
      display: grid;
      place-items: center;
      padding: 0.2rem;
      border-radius: 50%;
      background: transparent;
      box-shadow: none;
    }
    .opcion.elegido {
      outline: 4px solid var(--menta);
      outline-offset: 0;
    }
    /* El foco del teclado se distingue de la selección */
    .opcion:focus-visible {
      outline: 3px solid var(--azul);
      outline-offset: 2px;
    }
  `,
})
export class SelectorIcono {
  /** Para el lector de pantalla: qué se está eligiendo. */
  readonly titulo = input('Elige un icono');
  readonly elegido = input<string | null>(null);
  readonly elegir = output<string>();

  protected readonly iconos = ICONOS;
}
