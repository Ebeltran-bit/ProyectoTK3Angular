import { Component, inject, OnInit, signal } from '@angular/core';

import { EstadisticaParticipante } from '../../models/estadistica';
import { EstadisticasService } from '../../services/estadisticas.service';
import { mensajeError } from '../../services/mensaje-error';

/** Informe de victorias y derrotas por participante (fase 4). */
@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas implements OnInit {
  private readonly servicio = inject(EstadisticasService);

  protected readonly filas = signal<EstadisticaParticipante[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.porParticipante().subscribe({
      next: (filas) => {
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
