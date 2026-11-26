import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, filter, map, of, Subject, switchMap } from 'rxjs';

import { AvisoDuelo } from './components/aviso-duelo/aviso-duelo';
import { ControlesSonido } from './components/controles-sonido/controles-sonido';
import { IconoUsuario } from './components/icono-usuario/icono-usuario';
import { volumen } from './juego/volumen';
import { DueloPendiente } from './models/duelo';
import { ICONOS } from './models/iconos';
import { AuthService } from './services/auth.service';
import { DuelosService } from './services/duelos.service';
import { mensajeError } from './services/mensaje-error';
import { aplicarVolumen, burbuja, prepararAudio } from './sonido/interfaz';

/** Lo que suena con la burbuja: los botones y los enlaces con forma de botón. */
const CON_BURBUJA = 'button, a.boton, a.secundario, a.volver, a.principal, nav a, .logo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconoUsuario, ControlesSonido, AvisoDuelo],
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

  // ---------- Aviso «¡Te toca jugar!» (Eva, 26/11/2026) ----------
  private readonly duelos = inject(DuelosService);
  /** Duelos en los que le toca tocar al usuario, según la última consulta a la API. */
  private readonly pendientes = signal<DueloPendiente[]>([]);
  private readonly buscar = new Subject<void>();
  /** Avisos que el usuario ha cerrado con la × (por combate), mientras dure la pestaña. */
  private readonly cerrados = signal<Set<number>>(leerCerrados());
  /** Ruta actual: dentro de un duelo el aviso no sale, para no tapar el juego. */
  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly avisos = computed(() =>
    this.pendientes().filter((p) => !this.cerrados().has(p.id_combate)),
  );
  protected readonly enUnDuelo = computed(() => /\/combates\/\d+\/duelo/.test(this.ruta()));

  constructor() {
    // Con sesión, se pregunta al entrar, al cambiar de pantalla y cada 20 s
    // (salvo dentro de un duelo: ahí no se ve y una sesión caducada cortaría la canción)
    effect(() => {
      this.ruta();
      if (!this.auth.conectado()) this.pendientes.set([]);
      else if (!this.enUnDuelo()) this.buscarDuelos();
      else {
        // Al entrar en un duelo, su aviso se quita ya: así no reaparece al salir al podio
        const id = Number(/\/combates\/(\d+)\/duelo/.exec(this.ruta())?.[1]);
        this.pendientes.update((l) => l.filter((p) => p.id_combate !== id));
      }
    });
    const vuelta = setInterval(() => {
      if (this.auth.conectado() && !this.enUnDuelo()) this.buscarDuelos();
    }, 20000);
    // switchMap se queda solo con la última respuesta: una vieja no resucita un duelo ya jugado
    const busqueda = this.buscar
      .pipe(switchMap(() => this.duelos.misPendientes().pipe(catchError(() => of(null)))))
      .subscribe((lista) => {
        if (lista) this.pendientes.set(lista); // si la API no contesta, se deja lo que había
      });
    inject(DestroyRef).onDestroy(() => {
      clearInterval(vuelta);
      busqueda.unsubscribe();
    });

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

  private buscarDuelos(): void {
    this.buscar.next();
  }

  protected cerrarAviso(idCombate: number): void {
    this.cerrados.update((c) => new Set(c).add(idCombate));
    try {
      sessionStorage.setItem(CLAVE_CERRADOS, JSON.stringify([...this.cerrados()]));
    } catch {
      // sin sessionStorage el aviso cerrado vuelve a salir al recargar; no pasa nada
    }
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

const CLAVE_CERRADOS = 'tk3_avisos_cerrados';

function leerCerrados(): Set<number> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(CLAVE_CERRADOS) ?? '[]') as number[]);
  } catch {
    return new Set();
  }
}

/** El botón (o enlace con forma de botón) donde está el elemento, si no es parte del juego. */
function botonDe(objetivo: EventTarget | null): HTMLElement | null {
  if (!(objetivo instanceof Element)) return null;
  const boton = objetivo.closest<HTMLElement>(CON_BURBUJA);
  if (!boton || boton.closest('app-reproductor-ritmo')) return null;
  return boton;
}
