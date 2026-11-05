import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconoUsuario } from './components/icono-usuario/icono-usuario';
import { ICONOS } from './models/iconos';
import { AuthService } from './services/auth.service';
import { mensajeError } from './services/mensaje-error';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconoUsuario],
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
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigate(['/login']));
  }
}
