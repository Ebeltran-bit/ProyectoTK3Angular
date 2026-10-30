import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Participante } from '../../models/participante';
import { mensajeError } from '../../services/mensaje-error';
import { ParticipantesService } from '../../services/participantes.service';

type Filtro = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-participantes-lista',
  imports: [RouterLink],
  templateUrl: './participantes-lista.html',
  styleUrl: './participantes-lista.css',
})
export class ParticipantesLista implements OnInit {
  private readonly servicio = inject(ParticipantesService);

  protected readonly participantes = signal<Participante[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal<Filtro>('todos');
  /** Ids cuyo logo no se ha podido cargar: se muestra la inicial en su lugar. */
  protected readonly logosRotos = signal(new Set<number>());

  /** Lista que se muestra según el filtro elegido. */
  protected readonly visibles = computed(() => {
    const todos = this.participantes();
    switch (this.filtro()) {
      case 'activos':
        return todos.filter((p) => p.activo);
      case 'inactivos':
        return todos.filter((p) => !p.activo);
      default:
        return todos;
    }
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.participantes.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  marcarLogoRoto(id: number): void {
    this.logosRotos.update((ids) => new Set(ids).add(id));
  }

  cambiarEstado(participante: Participante): void {
    this.error.set(null);
    this.servicio.cambiarEstado(participante.id, !participante.activo).subscribe({
      // Sustituimos el participante actualizado en la lista
      next: (actualizado) =>
        this.participantes.update((lista) =>
          lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
        ),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
