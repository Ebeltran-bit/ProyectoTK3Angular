import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { ReproductorRitmo } from '../../components/reproductor-ritmo/reproductor-ritmo';
import {
  conEspacios,
  DatosResultado,
  TarjetaResultado,
} from '../../components/tarjeta-resultado/tarjeta-resultado';
import { Cancion, NOMBRE_NIVEL, Pulsacion } from '../../models/cancion';
import { Duelo as DatosDuelo } from '../../models/duelo';
import { nombreRonda } from '../../models/torneo';
import { AuthService } from '../../services/auth.service';
import { CancionesService } from '../../services/canciones.service';
import { DuelosService } from '../../services/duelos.service';
import { mensajeError } from '../../services/mensaje-error';

/**
 * Duelo de ritmo de un combate del torneo.
 * Cada participante toca la canción cuando puede; por los que no tienen cuenta
 * toca la IA sin preguntar (lo hace el backend al abrir el duelo). Cuando
 * están los dos resultados, el backend decide el ganador y el cuadro avanza.
 */
@Component({
  selector: 'app-duelo',
  imports: [RouterLink, ReproductorRitmo, TarjetaResultado, IconoUsuario, PantallaCarga],
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
  /** Cuando el duelo tiene ganador, se puede ver su podio (o el del torneo, si era la final). */
  protected readonly rutaPodio = ['/torneos', this.idTorneo, 'combates', this.idCombate, 'podio'];

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
  protected readonly conEspacios = conEspacios;
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

  /** Participante con el que juega el usuario de la sesión. */
  protected readonly miParticipante = computed(() => this.auth.usuario()?.id_participante ?? null);

  /** El otro jugador del duelo. */
  protected readonly rival = computed(
    () => this.duelo()?.jugadores.find((j) => j.participante.id !== this.miParticipante()) ?? null,
  );

  /** Mi resultado, cuando acabo de mandarlo: el backend me lo enseña aunque el rival no haya jugado. */
  protected readonly misDatos = computed<DatosResultado | null>(() => {
    if (!this.enviado()) return null;
    const r = this.duelo()?.jugadores.find(
      (j) => j.participante.id === this.miParticipante(),
    )?.resultado;
    return r ? { ...r, comboMaximo: r.combo_maximo } : null;
  });

  /** Título de la tarjeta final: cambia según se envía la partida y juega el rival. */
  protected readonly tituloFinal = computed(() => {
    const g = this.ganador();
    if (g) return `${g.participante.nick} gana el duelo`;
    if (this.misDatos()) return 'Partida enviada';
    if (this.errorEnvio()) return 'No se ha enviado tu partida';
    return 'Enviando tu partida…';
  });
}
