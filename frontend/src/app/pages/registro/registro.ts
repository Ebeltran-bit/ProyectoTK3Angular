import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/mensaje-error';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: '../login/acceso.css',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

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
      next: () => this.router.navigate(['/participantes']),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }
}
