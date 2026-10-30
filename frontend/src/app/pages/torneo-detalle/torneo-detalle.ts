import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Cuadro } from '../../components/cuadro/cuadro';
import { NOMBRE_ESTADO, TorneoDetalle as Torneo } from '../../models/torneo';
import { mensajeError } from '../../services/mensaje-error';
import { TorneosService } from '../../services/torneos.service';

@Component({
  selector: 'app-torneo-detalle',
  imports: [RouterLink, Cuadro],
  templateUrl: './torneo-detalle.html',
  styleUrl: './torneo-detalle.css',
})
export class TorneoDetalle implements OnInit {
  private readonly servicio = inject(TorneosService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly torneo = signal<Torneo | null>(null);
  protected readonly cargando = signal(true);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreEstado = NOMBRE_ESTADO;

  private get id(): number {
    return Number(this.ruta.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(this.id).subscribe({
      next: (t) => {
        this.torneo.set(t);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  generarCuadro(): void {
    if (!confirm('Al generar el cuadro ya no se podrán cambiar los participantes. ¿Continuar?')) {
      return;
    }
    this.generando.set(true);
    this.error.set(null);
    this.servicio.generarCuadro(this.id).subscribe({
      next: (t) => {
        this.torneo.set(t);
        this.generando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.generando.set(false);
      },
    });
  }
}
