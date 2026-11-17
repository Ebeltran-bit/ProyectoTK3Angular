import { Component, effect, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ControlesSonido } from './components/controles-sonido/controles-sonido';
import { IconoUsuario } from './components/icono-usuario/icono-usuario';
import { volumen } from './juego/volumen';
import { ICONOS } from './models/iconos';
import { AuthService } from './services/auth.service';
import { mensajeError } from './services/mensaje-error';
import { aplicarVolumen, burbuja, prepararAudio } from './sonido/interfaz';

/** Lo que suena con la burbuja: los botones y los enlaces con forma de botón. */
const CON_BURBUJA = 'button, a.boton, a.secundario, a.volver, a.principal, nav a, .logo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconoUsuario, ControlesSonido],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly iconos = ICONOS;
  /** Panel para elegir icono, que se abre pulsando en el nombre del usuario. */
  protected readonly eligiendo = signal(false);
  protected readonly errorIcono = signal<string | null>(null);
  /** Panel de sonido de la barra de arriba (las mismas barras que en el juego). */
  protected readonly panelSonido = signal(false);
  protected readonly volumen = volumen;

  constructor() {
    // Al mover una barra de volumen, la canción de fondo y la burbuja cambian al momento
    effect(() => {
      volumen();
      aplicarVolumen();
    });
  }

  /**
   * El audio solo puede empezar tras un gesto de la persona: el primer clic o tecla. En el
   * móvil el gesto que vale es levantar el dedo (pointerup), por eso se escuchan los dos.
   */
  @HostListener('document:pointerdown')
  @HostListener('document:pointerup')
  @HostListener('document:keydown')
  empezarAudio(): void {
    prepararAudio();
  }

  /** Burbuja al entrar con el ratón en un botón (no dentro del juego, que tiene sus sonidos). */
  @HostListener('document:pointerover', ['$event'])
  alPasar(evento: PointerEvent): void {
    // Con el dedo, pasar y pulsar son lo mismo: ya suena la burbuja del clic
    if (evento.pointerType !== 'mouse') return;
    const boton = botonDe(evento.target);
    // pointerover salta también al pasar por dentro del botón: solo suena al entrar
    if (boton && !boton.contains(evento.relatedTarget as Node | null)) burbuja();
  }

  /** Lo mismo al llegar con el tabulador, para quien usa el teclado. */
  @HostListener('document:focusin', ['$event'])
  alEnfocar(evento: FocusEvent): void {
    const boton = botonDe(evento.target);
    if (boton && boton.matches(':focus-visible')) burbuja();
  }

  @HostListener('document:click', ['$event'])
  alPulsar(evento: MouseEvent): void {
    if (botonDe(evento.target)) burbuja(true);
  }

  elegirIcono(icono: string | null): void {
    this.errorIcono.set(null);
    this.auth.cambiarIcono(icono).subscribe({
      next: () => this.eligiendo.set(false),
      error: (e) => this.errorIcono.set(mensajeError(e)),
    });
  }

  @HostListener('document:keydown.escape')
  cerrarSelector(): void {
    this.eligiendo.set(false);
    this.panelSonido.set(false);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigate(['/login']));
  }
}

/** El botón (o enlace con forma de botón) donde está el elemento, si no es parte del juego. */
function botonDe(objetivo: EventTarget | null): HTMLElement | null {
  if (!(objetivo instanceof Element)) return null;
  const boton = objetivo.closest<HTMLElement>(CON_BURBUJA);
  if (!boton || boton.closest('app-reproductor-ritmo')) return null;
  return boton;
}
