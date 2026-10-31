import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { NOMBRE_NIVEL } from '../../models/cancion';
import { EstadisticaParticipante, RecordsCancion } from '../../models/estadistica';
import { EstadisticasService } from '../../services/estadisticas.service';
import { mensajeError } from '../../services/mensaje-error';

type Pestana = 'participantes' | 'canciones';

/** Informes: victorias y derrotas por participante (fase 4) y récords por canción. */
@Component({
  selector: 'app-estadisticas',
  imports: [DatePipe],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas implements OnInit {
  private readonly servicio = inject(EstadisticasService);

  protected readonly pestana = signal<Pestana>('participantes');
  protected readonly filas = signal<EstadisticaParticipante[]>([]);
  protected readonly records = signal<RecordsCancion[]>([]);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  verPestana(p: Pestana): void {
    this.pestana.set(p);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const fallo = (e: unknown) => {
      this.error.set(mensajeError(e));
      this.cargando.set(false);
    };
    if (this.pestana() === 'participantes') {
      this.servicio.porParticipante().subscribe({
        next: (filas) => {
          this.filas.set(filas);
          this.cargando.set(false);
        },
        error: fallo,
      });
    } else {
      this.servicio.recordsPorCancion().subscribe({
        next: (records) => {
          this.records.set(records);
          this.cargando.set(false);
        },
        error: fallo,
      });
    }
  }
}
