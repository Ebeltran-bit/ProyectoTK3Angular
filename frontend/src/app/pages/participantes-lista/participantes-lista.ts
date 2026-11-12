import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { Participante } from '../../models/participante';
import { mensajeError } from '../../services/mensaje-error';
import { ParticipantesService } from '../../services/participantes.service';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { iconoDe } from '../../models/iconos';

type Filtro = 'todos' | 'activos' | 'inactivos';

/** Color del borde del logo: cada participante tiene siempre el mismo, según su id. */
const COLORES_CARA = ['#e8505b', '#5aa0c8', '#7cc56a', '#ff8fa3', '#e0a21a', '#9b6fd6'];

@Component({
  selector: 'app-participantes-lista',
  imports: [RouterLink, IconoUsuario, PantallaCarga],
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

  /** Su icono de usuario o un animal fijo según su id (ver models/iconos.ts). */
  protected readonly iconoDe = iconoDe;

  colorDe(participante: Participante): string {
    return COLORES_CARA[participante.id % COLORES_CARA.length];
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
