import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';

import { ReproductorRitmo } from '../../components/reproductor-ritmo/reproductor-ritmo';
import { TarjetaResultado } from '../../components/tarjeta-resultado/tarjeta-resultado';
import { estrellasPorHype } from '../../juego/evaluacion';
import {
  Cancion,
  CancionResumen,
  Nivel,
  NOMBRE_NIVEL,
  Pulsacion,
  Resultado,
} from '../../models/cancion';
import { CancionesService } from '../../services/canciones.service';
import { mensajeError } from '../../services/mensaje-error';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';

/**
 * Pantalla de práctica del duelo de ritmo.
 * Lista las canciones, usa el reproductor para tocar la elegida y, al acabar,
 * manda las pulsaciones a la API para guardar la partida (récords).
 */
@Component({
  selector: 'app-practica',
  imports: [ReproductorRitmo, TarjetaResultado, PantallaCarga],
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
  private readonly reproductor = viewChild(ReproductorRitmo);

  /**
   * Lo que enseña la tarjeta final: la puntuación oficial del backend en cuanto llega y,
   * mientras tanto, la que ha contado el navegador (suelen coincidir).
   */
  protected readonly final = computed(() => {
    const reproductor = this.reproductor();
    // Angular crea el contenido proyectado aunque todavía no se vea. Si la tarjeta existiera
    // durante la canción, contaría los puntos sin que nadie la viera: se crea al terminar.
    if (!reproductor || reproductor.fase() !== 'terminada') return null;
    const r = this.oficial();
    const datos = r ? { ...r, comboMaximo: r.combo_maximo } : reproductor.marcador();
    return {
      datos,
      hype: datos.hype,
      estrellas: estrellasPorHype(datos.hype),
      mensaje: reproductor.escenario().mensajeFinal(datos.hype),
    };
  });

  /** Filtro por nivel y orden de la lista (solo afectan a lo que se ve). */
  protected readonly niveles: Nivel[] = ['facil', 'media', 'dificil'];
  protected readonly filtro = signal<Nivel | 'todas'>('todas');
  protected readonly orden = signal<'facil-primero' | 'dificil-primero'>('facil-primero');
  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    const signo = this.orden() === 'facil-primero' ? 1 : -1;
    return this.canciones()
      .filter((c) => filtro === 'todas' || c.nivel === filtro)
      .sort((a, b) => signo * (this.niveles.indexOf(a.nivel) - this.niveles.indexOf(b.nivel)));
  });

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
  protected otraVez(): void {
    this.oficial.set(null);
    this.errorGuardar.set(null);
    void this.reproductor()?.jugar();
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
