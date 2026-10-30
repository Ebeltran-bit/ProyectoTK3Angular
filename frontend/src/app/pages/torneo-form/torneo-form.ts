import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { Participante } from '../../models/participante';
import { mensajeError } from '../../services/mensaje-error';
import { ParticipantesService } from '../../services/participantes.service';
import { TorneosService } from '../../services/torneos.service';

/** Crear (/torneos/nuevo) o editar (/torneos/:id/editar) un torneo en preparación. */
@Component({
  selector: 'app-torneo-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './torneo-form.html',
  styleUrl: './torneo-form.css',
})
export class TorneoForm implements OnInit {
  private readonly torneos = inject(TorneosService);
  private readonly participantes = inject(ParticipantesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly idEditando = signal<number | null>(null);
  protected readonly nombre = signal('');
  /** Participantes que se pueden elegir: los activos (y, al editar, los ya inscritos). */
  protected readonly disponibles = signal<Participante[]>([]);
  protected readonly seleccionados = signal(new Set<number>());
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly intentado = signal(false);

  protected readonly nombreValido = computed(() => this.nombre().trim().length > 0);
  protected readonly suficientes = computed(() => this.seleccionados().size >= 2);

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    this.idEditando.set(id ? Number(id) : null);

    forkJoin({
      activos: this.participantes.listar(true),
      torneo: id ? this.torneos.obtener(Number(id)) : of(null),
    }).subscribe({
      next: ({ activos, torneo }) => {
        let lista = activos;
        if (torneo) {
          this.nombre.set(torneo.nombre);
          this.seleccionados.set(new Set(torneo.participantes.map((p) => p.id)));
          // Un inscrito que se desactivó después sigue apareciendo para poder quitarlo
          const extra = torneo.participantes.filter((p) => !activos.some((a) => a.id === p.id));
          lista = [...activos, ...extra];
        }
        this.disponibles.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  alternar(id: number): void {
    this.seleccionados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  seleccionarTodos(): void {
    this.seleccionados.set(new Set(this.disponibles().filter((p) => p.activo).map((p) => p.id)));
  }

  ninguno(): void {
    this.seleccionados.set(new Set());
  }

  guardar(): void {
    this.intentado.set(true);
    if (!this.nombreValido() || !this.suficientes()) {
      return;
    }
    const datos = { nombre: this.nombre().trim(), participantes: [...this.seleccionados()] };
    const id = this.idEditando();
    const peticion = id === null ? this.torneos.crear(datos) : this.torneos.editar(id, datos);

    this.guardando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: (torneo) => this.router.navigate(['/torneos', torneo.id]),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
