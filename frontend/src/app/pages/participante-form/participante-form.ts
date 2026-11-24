import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { iconoDe } from '../../models/iconos';
import { mensajeError } from '../../services/mensaje-error';
import { ParticipantesService } from '../../services/participantes.service';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { SelectorIcono } from '../../components/selector-icono/selector-icono';

/** Formulario para crear (ruta /participantes/nuevo) o editar (/participantes/:id/editar). */
@Component({
  selector: 'app-participante-form',
  imports: [ReactiveFormsModule, RouterLink, PantallaCarga, SelectorIcono],
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
  /** Icono elegido en la rejilla (null = un animal según su id). */
  protected readonly icono = signal<string | null>(null);
  /** Si tiene cuenta, el icono lo elige su dueño desde la barra de arriba. */
  protected readonly tieneCuenta = signal(false);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nick: ['', [Validators.required, Validators.maxLength(30)]],
    // El campo del logo ya no se enseña (Eva, 24/11/2026: solo el icono); si un participante
    // antiguo tenía logo, se conserva al editarlo
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
          // Se marca el que se ve ahora (el elegido o el animal que le toca por su id)
          this.icono.set(iconoDe(p));
          this.tieneCuenta.set(p.tiene_usuario);
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
    const datos = {
      nick: valores.nick.trim(),
      logo: valores.logo.trim() || null,
      icono: this.tieneCuenta() ? null : this.icono(),
    };
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
