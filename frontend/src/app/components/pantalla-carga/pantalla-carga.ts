import { Component, input } from '@angular/core';

/**
 * Pantalla de carga de las páginas del duelo y del podio: una nota musical que bota,
 * un título y un texto. Es la «cortina de carga» de las propuestas de la etapa 3
 * (bocetos/renovacion-3d), pero sobre el fondo de rayas de la web (decisión de Eva,
 * 12/11/2026).
 */
@Component({
  selector: 'app-pantalla-carga',
  template: `
    <div class="carga" role="status">
      <span class="nota" aria-hidden="true">♪</span>
      <p class="titulo">{{ titulo() }}</p>
      <p class="texto">{{ texto() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .carga {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      text-align: center;
    }
    /* Círculo dorado con brillo arriba y sombra sólida debajo, que bota sin parar.
       Es el dorado del juego (el mismo que reproductor-ritmo), no el --amarillo del tema. */
    .nota {
      display: grid;
      place-items: center;
      width: 5.5rem;
      height: 5.5rem;
      margin-bottom: 0.6rem;
      border-radius: 50%;
      font-size: 3rem;
      color: #ffffff;
      background: radial-gradient(circle at 35% 30%, #ffe58a, #ffb72e 60%, #f08a1c);
      box-shadow:
        inset 0 -0.3rem 0 rgb(160 70 0 / 0.35),
        0 0.4rem 0 #c98a12,
        0 0.9rem 1.2rem rgb(120 80 20 / 0.3);
      animation: bote 0.75s infinite cubic-bezier(0.3, 0, 0.7, 1) alternate;
    }
    .titulo {
      margin: 0;
      font:
        700 1.9rem 'Fredoka',
        sans-serif;
      line-height: 1.1;
    }
    .texto {
      margin: 0;
      font-weight: 700;
      color: var(--tinta-suave);
    }
    @keyframes bote {
      to {
        transform: translateY(-1rem);
      }
    }
  `,
})
export class PantallaCarga {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
}
