import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { Apariencia } from '../../juego/sprites/apariencia';
import { spritePersonaje } from '../../juego/sprites/dibujar-personaje';
import { ALTO, ANCHO, ANIMACIONES, NombreAnimacion } from '../../juego/sprites/poses';

const MS_POR_FOTOGRAMA = 220;
const MS_GOLPE = 350;

/** Personaje animado en un canvas. Se usa en el editor (y más adelante en otras pantallas). */
@Component({
  selector: 'app-vista-personaje',
  template: `<canvas
    #lienzo
    [width]="ancho"
    [height]="alto"
    aria-label="Vista previa del personaje"
  ></canvas>`,
  styles: `
    canvas {
      image-rendering: pixelated;
      display: block;
    }
  `,
})
export class VistaPersonaje {
  readonly apariencia = input.required<Apariencia>();
  /** Cuántos píxeles de pantalla ocupa cada píxel del sprite. */
  readonly escala = input(5);

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private animacion: NombreAnimacion = 'reposo';
  private inicioAnimacion = 0;

  protected get ancho(): number {
    return ANCHO * this.escala();
  }
  protected get alto(): number {
    return (ALTO + 4) * this.escala();
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let id = 0;
      const bucle = (ahora: number) => {
        this.dibujar(ahora);
        id = requestAnimationFrame(bucle);
      };
      id = requestAnimationFrame(bucle);
      destroyRef.onDestroy(() => cancelAnimationFrame(id));
    });
  }

  /** Reproduce un golpe una vez y vuelve a la guardia. */
  reproducir(animacion: NombreAnimacion): void {
    this.animacion = animacion;
    this.inicioAnimacion = performance.now();
  }

  private dibujar(ahora: number): void {
    if (this.animacion !== 'reposo' && ahora - this.inicioAnimacion > MS_GOLPE) {
      this.animacion = 'reposo';
    }
    const fotogramas = ANIMACIONES[this.animacion];
    const pose = fotogramas[Math.floor(ahora / MS_POR_FOTOGRAMA) % fotogramas.length];
    const escala = this.escala();
    const ctx = this.lienzo().nativeElement.getContext('2d')!;

    ctx.clearRect(0, 0, this.ancho, this.alto);
    ctx.imageSmoothingEnabled = false;
    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(14 * escala, (ALTO - 1) * escala, 22 * escala, 2 * escala);
    ctx.fillRect(16 * escala, (ALTO + 1) * escala, 18 * escala, 1 * escala);
    ctx.drawImage(spritePersonaje(this.apariencia(), pose), 0, 0, ANCHO * escala, ALTO * escala);
  }
}
