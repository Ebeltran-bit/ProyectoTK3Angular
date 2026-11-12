import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { NOMBRE_NIVEL } from '../../models/cancion';
import { Marca, RecordsCancion } from '../../models/estadistica';
import { iconoDeMarca } from '../../models/iconos';
import { EstadisticasService } from '../../services/estadisticas.service';
import { mensajeError } from '../../services/mensaje-error';

/**
 * Top 10 de una canción (petición de Eva, 12/11/2026): los tres primeros en un podio y
 * debajo la tabla con los diez puestos. El orden y los puestos los decide el backend.
 */
@Component({
  selector: 'app-top-cancion',
  imports: [DatePipe, RouterLink, IconoUsuario, PantallaCarga],
  templateUrl: './top-cancion.html',
  // El podio usa los mismos estilos que el del duelo, para que los dos se vean iguales
  styleUrls: ['../podio/podio.css', './top-cancion.css'],
})
export class TopCancion implements OnInit {
  private readonly servicio = inject(EstadisticasService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly id = this.ruta.snapshot.paramMap.get('id') ?? '';
  protected readonly records = signal<RecordsCancion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  protected readonly iconoDeMarca = iconoDeMarca;

  /** Los tres primeros puestos, que suben al podio. */
  protected readonly podio = computed<Marca[]>(() => this.records()?.marcas.slice(0, 3) ?? []);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.recordsDeCancion(this.id).subscribe({
      next: (r) => {
        this.records.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Lo que anuncia un lector de pantalla al llegar a cada escalón. */
  protected descripcion(m: Marca): string {
    return `${m.puesto}.º: ${m.nombre_usuario}, ${m.puntos} puntos`;
  }
}
