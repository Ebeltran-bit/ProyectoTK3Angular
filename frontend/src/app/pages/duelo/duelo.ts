import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { ReproductorRitmo } from '../../components/reproductor-ritmo/reproductor-ritmo';
import {
  DatosResultado,
  TarjetaResultado,
} from '../../components/tarjeta-resultado/tarjeta-resultado';
import { conEspacios } from '../../juego/formato';
import { Cancion, NOMBRE_NIVEL, Pulsacion } from '../../models/cancion';
import { Duelo as DatosDuelo } from '../../models/duelo';
import { nombreRonda } from '../../models/torneo';
import { AuthService } from '../../services/auth.service';
import { CancionesService } from '../../services/canciones.service';
import { DuelosService } from '../../services/duelos.service';
import { mensajeError } from '../../services/mensaje-error';
import { iconoDe } from '../../models/iconos';

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
export class Duelo implements OnInit, OnDestroy {
  protected readonly iconoDe = iconoDe;
  private readonly servicio = inject(DuelosService);
  private readonly canciones = inject(CancionesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  /** Para leer «Tu ritmo» y el oro de la partida que se acaba de tocar. */
  protected readonly reproductor = viewChild(ReproductorRitmo);

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

  /** Cuando ya se sabe quién gana, el duelo lleva al podio; replaceUrl hace que «atrás» vuelva al torneo. */
  private irAlPodio(): void {
    void this.router.navigate(this.rutaPodio, { replaceUrl: true });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(this.idTorneo, this.idCombate).subscribe({
      next: (d) => {
        // Si al abrirlo ya tiene ganador (o la IA lo acaba de decidir), se va directo al podio
        if (d.id_ganador !== null) this.irAlPodio();
        else this.mostrar(d);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Guarda el duelo que devuelve la API y, si le toca jugar al usuario, pide la canción. */
  private mostrar(d: DatosDuelo): void {
    this.duelo.set(d);
    this.esperarAlRival(d);
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
        // Si con esta partida ya hay ganador, directo al podio (lo pidió Eva el 22/11/2026)
        if (d.id_ganador !== null) this.irAlPodio();
      },
      error: (e) => {
        // 409: el combate se decidió mientras tocabas (por ejemplo, alguien eligió el ganador en el cuadro).
        // Se vuelve a cargar el duelo, que lleva al podio si ya hay ganador.
        if (this.esConflicto(e)) {
          this.enviando.set(false);
          this.cargar();
          return;
        }
        this.errorEnvio.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }

  /** Cada cuánto se mira si el rival ya ha tocado mientras esperas. */
  private static readonly ESPERA_MS = 5000;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  /** Consulta en marcha: se cancela al salir, para no llevar al podio a quien ya se fue. */
  private consulta: Subscription | null = null;

  /**
   * Si ya he tocado y falta mi rival, se pregunta a la API cada pocos segundos; en cuanto él
   * toca y hay ganador, se va sola al podio (Eva, 26/11/2026). Sin partidas en directo: solo
   * se consulta el mismo duelo de siempre.
   */
  private esperarAlRival(d: DatosDuelo): void {
    const yo = d.jugadores.find((j) => j.participante.id === this.miParticipante());
    const esperando = d.estado === 'pendiente' && !!yo?.ha_jugado;
    if (!esperando) {
      this.dejarDeEsperar();
    } else if (this.temporizador === null) {
      this.temporizador = setInterval(() => {
        if (this.consulta && !this.consulta.closed) return; // la anterior aún no ha contestado
        this.consulta = this.servicio.obtener(this.idTorneo, this.idCombate).subscribe({
          next: (nuevo) => {
            if (nuevo.id_ganador !== null) {
              this.dejarDeEsperar();
              this.irAlPodio();
              return;
            }
            // Si vuelve a tocarme sin ganador es que hubo empate total y el duelo se repite
            if (nuevo.puedo_jugar && !nuevo.mensaje) {
              nuevo = { ...nuevo, mensaje: 'Empate total: el duelo se repite con otra canción' };
            }
            this.mostrar(nuevo);
          },
          error: (e) => {
            // 404: el torneo ya no existe y no tiene sentido seguir; otro fallo se reintenta
            if (e instanceof HttpErrorResponse && e.status === 404) this.dejarDeEsperar();
          },
        });
      }, Duelo.ESPERA_MS);
    }
  }

  private dejarDeEsperar(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    this.consulta?.unsubscribe();
    this.consulta = null;
  }

  ngOnDestroy(): void {
    this.dejarDeEsperar();
  }

  private esConflicto(e: unknown): boolean {
    return e instanceof HttpErrorResponse && e.status === 409;
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
