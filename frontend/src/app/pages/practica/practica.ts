import { Component, inject, OnInit, signal } from '@angular/core';

import { ReproductorRitmo } from '../../components/reproductor-ritmo/reproductor-ritmo';
import { Cancion, CancionResumen, NOMBRE_NIVEL, Pulsacion, Resultado } from '../../models/cancion';
import { CancionesService } from '../../services/canciones.service';
import { mensajeError } from '../../services/mensaje-error';

/**
 * Pantalla de práctica del duelo de ritmo.
 * Lista las canciones, usa el reproductor para tocar la elegida y, al acabar,
 * manda las pulsaciones a la API para guardar la partida (récords).
 */
@Component({
  selector: 'app-practica',
  imports: [ReproductorRitmo],
  templateUrl: './practica.html',
  styleUrl: './practica.css',
})
export class Practica implements OnInit {
  private readonly servicio = inject(CancionesService);

  protected readonly canciones = signal<CancionResumen[]>([]);
  protected readonly cancion = signal<Cancion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  /** Puntuación oficial que devuelve el backend al guardar la partida. */
  protected readonly oficial = signal<Resultado | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  private pulsaciones: Pulsacion[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.canciones.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  elegir(id: string): void {
    this.error.set(null);
    this.servicio.obtener(id).subscribe({
      next: (c) => this.cancion.set(c),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  volverALaLista(): void {
    this.cancion.set(null);
  }

  /** Empieza otra vez la misma canción. */
  protected otraVez(reproductor: ReproductorRitmo): void {
    this.oficial.set(null);
    this.errorGuardar.set(null);
    reproductor.jugar();
  }

  /** Al acabar la canción se mandan las pulsaciones; el récord usa la puntuación del backend. */
  protected alTerminar(pulsaciones: Pulsacion[]): void {
    this.pulsaciones = pulsaciones;
    this.guardarPartida();
  }

  protected guardarPartida(): void {
    const c = this.cancion();
    if (!c) return;
    this.oficial.set(null);
    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.servicio.guardarPartida(c.id, this.pulsaciones).subscribe({
      next: (r) => {
        this.oficial.set(r);
        this.guardando.set(false);
      },
      error: (e) => {
        this.errorGuardar.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
