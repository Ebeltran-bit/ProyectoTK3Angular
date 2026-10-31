import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ReproductorRitmo } from '../../components/reproductor-ritmo/reproductor-ritmo';
import { Cancion, NOMBRE_NIVEL, Pulsacion } from '../../models/cancion';
import { Duelo as DatosDuelo, JugadorDuelo } from '../../models/duelo';
import { nombreRonda } from '../../models/torneo';
import { AuthService } from '../../services/auth.service';
import { CancionesService } from '../../services/canciones.service';
import { DuelosService } from '../../services/duelos.service';
import { mensajeError } from '../../services/mensaje-error';

/**
 * Duelo de ritmo de un combate del torneo.
 * Cada participante toca la canción cuando puede (o la IA por él). Cuando
 * están los dos resultados, el backend decide el ganador y el cuadro avanza.
 */
@Component({
  selector: 'app-duelo',
  imports: [RouterLink, ReproductorRitmo],
  templateUrl: './duelo.html',
  styleUrl: './duelo.css',
})
export class Duelo implements OnInit {
  private readonly servicio = inject(DuelosService);
  private readonly canciones = inject(CancionesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly idTorneo = Number(this.ruta.snapshot.paramMap.get('id'));
  private readonly idCombate = Number(this.ruta.snapshot.paramMap.get('idCombate'));

  protected readonly duelo = signal<DatosDuelo | null>(null);
  /** Beatmap completo; solo se pide si al usuario le toca jugar. */
  protected readonly cancion = signal<Cancion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  /** true cuando el usuario ya ha mandado su partida (para enseñar su resultado sobre el escenario). */
  protected readonly enviado = signal(false);
  protected readonly nombreNivel = NOMBRE_NIVEL;
  private pulsaciones: Pulsacion[] = [];

  protected readonly titulo = computed(() => {
    const d = this.duelo();
    return d ? nombreRonda(d.ronda, d.total_rondas) : '';
  });

  protected readonly ganador = computed(() => {
    const d = this.duelo();
    return d?.jugadores.find((j) => j.participante.id === d.id_ganador) ?? null;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(this.idTorneo, this.idCombate).subscribe({
      next: (d) => this.mostrar(d),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Guarda el duelo que devuelve la API y, si le toca jugar al usuario, pide la canción. */
  private mostrar(d: DatosDuelo): void {
    this.duelo.set(d);
    if (d.puedo_jugar && this.cancion()?.id !== d.cancion.id) {
      this.canciones.obtener(d.cancion.id).subscribe({
        next: (c) => {
          this.cancion.set(c);
          this.enviado.set(false);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
    } else {
      this.cargando.set(false);
    }
  }

  protected alTerminar(pulsaciones: Pulsacion[]): void {
    this.pulsaciones = pulsaciones;
    this.enviar();
  }

  /** Manda las pulsaciones. Si falla, se puede reintentar sin volver a tocar la canción. */
  protected enviar(): void {
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.servicio.jugar(this.idTorneo, this.idCombate, this.pulsaciones).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.enviado.set(true);
        this.mostrar(d);
      },
      error: (e) => {
        this.errorEnvio.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }

  protected jugarIa(j: JugadorDuelo): void {
    this.enviando.set(true);
    this.error.set(null);
    this.servicio.jugarIa(this.idTorneo, this.idCombate, j.participante.id).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.mostrar(d);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }

  /** Mi resultado, cuando acabo de mandarlo: el backend me lo enseña aunque el rival no haya jugado. */
  protected readonly miResultado = computed(() => {
    if (!this.enviado()) return null;
    const miParticipante = this.auth.usuario()?.id_participante;
    return this.duelo()?.jugadores.find((j) => j.participante.id === miParticipante)?.resultado;
  });
}
