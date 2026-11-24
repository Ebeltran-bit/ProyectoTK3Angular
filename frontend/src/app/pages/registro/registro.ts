import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SelectorIcono } from '../../components/selector-icono/selector-icono';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/mensaje-error';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, SelectorIcono],
  templateUrl: './registro.html',
  styleUrl: '../login/acceso.css',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Icono elegido al registrarse (pedido por Eva el 24/11/2026); null = su inicial. */
  protected readonly icono = signal<string | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre_usuario: ['', [Validators.required, Validators.maxLength(30)]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
  });

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.registrar(this.formulario.getRawValue()).subscribe({
      next: () => {
        const icono = this.icono();
        if (icono === null) {
          void this.router.navigate(['/']);
          return;
        }
        // Con la sesión ya abierta se guarda el icono, como al cambiarlo desde la barra de arriba.
        // Si falla, la cuenta ya está creada: se entra igual y se puede elegir luego.
        this.auth.cambiarIcono(icono).subscribe({
          next: () => void this.router.navigate(['/']),
          error: () => void this.router.navigate(['/']),
        });
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }
}
