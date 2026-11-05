import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ICONOS } from '../../models/iconos';

/** Cada icono necesita un id de recorte distinto aunque haya varios en la página. */
let siguiente = 0;

/**
 * Icono del usuario: el personaje elegido dentro de un círculo de color, o su
 * inicial si todavía no ha elegido ninguno.
 */
@Component({
  selector: 'app-icono-usuario',
  template: `
    @if (svg(); as s) {
      <span class="icono" [style.width.px]="tam()" [style.height.px]="tam()" [innerHTML]="s"></span>
    } @else {
      <span
        class="inicial"
        [style.width.px]="tam()"
        [style.height.px]="tam()"
        [style.font-size.px]="tam() * 0.5"
        >{{ nombre().charAt(0) }}</span
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    .icono ::ng-deep svg {
      width: 100%;
      height: 100%;
    }
    .inicial {
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--rosa);
      color: #fff;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
    }
  `,
})
export class IconoUsuario {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly recorte = `recorte-icono-${siguiente++}`;

  /** Id del icono (null o desconocido: se muestra la inicial). */
  readonly icono = input<string | null | undefined>(null);
  /** Nombre del usuario, para la inicial. */
  readonly nombre = input('');
  readonly tam = input(30);

  protected readonly svg = computed<SafeHtml | null>(() => {
    const c = ICONOS.find((i) => i.id === this.icono());
    if (!c) return null;
    // Angular quita los SVG de innerHTML por seguridad. Aquí se permite porque el
    // dibujo es una constante del propio código (models/iconos.ts), no texto del usuario.
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 100 100" role="img" aria-label="${c.nombre}">` +
        `<defs><clipPath id="${this.recorte}"><circle cx="50" cy="50" r="44"/></clipPath></defs>` +
        `<circle cx="50" cy="50" r="46" fill="${c.fondo}"/>` +
        `<g clip-path="url(#${this.recorte})">${c.dibujo}</g>` +
        `<circle cx="50" cy="50" r="45" fill="none" stroke="${c.borde}" stroke-width="5"/></svg>`,
    );
  });
}
