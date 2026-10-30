import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeError } from '../../services/mensaje-error';
import { ParticipantesService } from '../../services/participantes.service';

/** Formulario para crear (ruta /participantes/nuevo) o editar (/participantes/:id/editar). */
@Component({
  selector: 'app-participante-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './participante-form.html',
  styleUrl: './participante-form.css',
})
export class ParticipanteForm implements OnInit {
  private readonly servicio = inject(ParticipantesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** null = creando; un número = editando ese participante. */
  protected readonly idEditando = signal<number | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nick: ['', [Validators.required, Validators.maxLength(30)]],
    logo: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (id) {
      this.idEditando.set(Number(id));
      this.cargando.set(true);
      this.servicio.obtener(Number(id)).subscribe({
        next: (p) => {
          this.formulario.setValue({ nick: p.nick, logo: p.logo ?? '' });
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
    }
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const datos = { nick: valores.nick.trim(), logo: valores.logo.trim() || null };
    const id = this.idEditando();
    const peticion = id === null ? this.servicio.crear(datos) : this.servicio.editar(id, datos);

    this.guardando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: () => this.router.navigate(['/participantes']),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
