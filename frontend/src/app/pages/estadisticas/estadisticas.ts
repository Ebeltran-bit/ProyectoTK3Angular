import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NOMBRE_NIVEL } from '../../models/cancion';
import { EstadisticaParticipante, RecordsCancion } from '../../models/estadistica';
import { EstadisticasService } from '../../services/estadisticas.service';
import { mensajeError } from '../../services/mensaje-error';
import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { iconoDe, iconoDeMarca } from '../../models/iconos';

type Pestana = 'participantes' | 'canciones';

/** Informes: récords por canción (primero, petición de Eva) y victorias y derrotas por participante (fase 4). */
@Component({
  selector: 'app-estadisticas',
  imports: [DatePipe, RouterLink, IconoUsuario, PantallaCarga],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas implements OnInit {
  private readonly servicio = inject(EstadisticasService);

  protected readonly pestana = signal<Pestana>('canciones');
  protected readonly filas = signal<EstadisticaParticipante[]>([]);
  protected readonly records = signal<RecordsCancion[]>([]);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  /** Su icono de usuario o el animal que le toca (ver models/iconos.ts). */
  protected readonly iconoDe = iconoDe;
  protected readonly iconoDeMarca = iconoDeMarca;
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
    if (this.pestana() === 'canciones') {
      this.servicio.recordsPorCancion().subscribe({
        next: (records) => {
          this.records.set(records);
          this.cargando.set(false);
        },
        error: fallo,
      });
    } else {
      this.servicio.porParticipante().subscribe({
        next: (filas) => {
          this.filas.set(filas);
          this.cargando.set(false);
        },
        error: fallo,
      });
    }
  }
}
