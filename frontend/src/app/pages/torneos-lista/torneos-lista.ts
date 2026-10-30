import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NOMBRE_ESTADO, TorneoResumen } from '../../models/torneo';
import { mensajeError } from '../../services/mensaje-error';
import { TorneosService } from '../../services/torneos.service';

@Component({
  selector: 'app-torneos-lista',
  imports: [RouterLink, DatePipe],
  templateUrl: './torneos-lista.html',
  styleUrl: './torneos-lista.css',
})
export class TorneosLista implements OnInit {
  private readonly servicio = inject(TorneosService);

  protected readonly torneos = signal<TorneoResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreEstado = NOMBRE_ESTADO;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.torneos.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
