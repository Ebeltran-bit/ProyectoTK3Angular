import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IconoUsuario } from '../../components/icono-usuario/icono-usuario';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';
import { Duelo, ResultadoDuelo } from '../../models/duelo';
import { Combate, nombreRonda, ParticipanteResumen, TorneoDetalle } from '../../models/torneo';
import { DuelosService } from '../../services/duelos.service';
import { mensajeError } from '../../services/mensaje-error';
import { TorneosService } from '../../services/torneos.service';
import { iconoDe } from '../../models/iconos';

/** Un escalón del podio: puesto (1, 2 o 3) y quién está en él. */
export interface Escalon {
  puesto: 1 | 2 | 3;
  participantes: ParticipanteResumen[];
  /** Puntos del duelo (solo en el podio de un duelo). */
  resultado?: ResultadoDuelo | null;
}

/**
 * Podio que se ve al terminar un combate (decisión de Eva, 12/11/2026; desde el 22/11/2026
 * también si el ganador se eligió a mano, sin duelo).
 * En un combate cualquiera: el ganador en el escalón alto y el perdedor en el segundo, con
 * sus puntos si hubo duelo.
 * Si era la final: el podio del torneo, con campeón, subcampeón y semifinalistas.
 * Solo enseña datos que ya ha decidido el backend; aquí no se calcula ningún ganador.
 */
@Component({
  selector: 'app-podio',
  imports: [RouterLink, IconoUsuario, PantallaCarga],
  templateUrl: './podio.html',
  styleUrl: './podio.css',
})
export class Podio implements OnInit {
  protected readonly iconoDe = iconoDe;
  private readonly duelos = inject(DuelosService);
  private readonly torneos = inject(TorneosService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly idTorneo = Number(this.ruta.snapshot.paramMap.get('id'));
  protected readonly idCombate = Number(this.ruta.snapshot.paramMap.get('idCombate'));

  /** El torneo trae el combate y su ganador, haya habido duelo o no. */
  protected readonly torneo = signal<TorneoDetalle | null>(null);
  /** Solo si el combate se jugó con duelo: de aquí salen los puntos. */
  protected readonly duelo = signal<Duelo | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly combate = computed(
    () => this.torneo()?.combates.find((c) => c.id === this.idCombate) ?? null,
  );

  protected readonly esFinal = computed(() => {
    const c = this.combate();
    return c !== null && c.ronda === this.torneo()!.total_rondas;
  });

  protected readonly titulo = computed(() => {
    const c = this.combate();
    if (!c) return '';
    if (this.esFinal() && c.id_ganador !== null) return '¡Tenemos campeón!';
    return `${nombreRonda(c.ronda, this.torneo()!.total_rondas)} · Podio`;
  });

  /**
   * Escalones en orden 1.º, 2.º, 3.º (así los lee un lector de pantalla). El CSS los
   * recoloca para pintar el 1.º en medio.
   */
  protected readonly escalones = computed<Escalon[]>(() => {
    const t = this.torneo();
    const c = this.combate();
    if (!t || !c || c.id_ganador === null) return [];
    const d = this.duelo();
    if (!this.esFinal()) return d ? podioDelDuelo(d) : podioDelCombate(t, c);
    // En la final, el campeón y el subcampeón llevan también sus puntos, si hubo duelo
    const puntos = (e: Escalon) =>
      d?.jugadores.find((j) => j.participante.id === e.participantes[0].id)?.resultado;
    return podioDelTorneo(t).map((e) => (e.puesto < 3 ? { ...e, resultado: puntos(e) } : e));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.torneos.obtener(this.idTorneo).subscribe({
      next: (t) => {
        this.torneo.set(t);
        const c = this.combate();
        if (!c) {
          this.fallo(null, 'Este combate no está en el torneo');
          return;
        }
        if (c.id_ganador === null) {
          this.cargando.set(false);
          return;
        }
        // Los puntos salen del duelo. Si el ganador se eligió a mano no hay duelo (la API
        // responde 409) y el podio sale igual, sin puntos.
        this.duelos.obtener(this.idTorneo, this.idCombate).subscribe({
          next: (d) => {
            this.duelo.set(d);
            this.cargando.set(false);
          },
          error: (e) => {
            if (e instanceof HttpErrorResponse && e.status === 409) this.cargando.set(false);
            else this.fallo(e);
          },
        });
      },
      error: (e) => this.fallo(e),
    });
  }

  private fallo(e: unknown, mensaje?: string): void {
    this.error.set(mensaje ?? mensajeError(e));
    this.cargando.set(false);
  }

  protected nombrePuesto(puesto: number): string {
    if (this.esFinal()) return ['', 'Campeón', 'Subcampeón', 'Semifinales'][puesto];
    return ['', 'Gana', 'Pierde', ''][puesto];
  }

  /** Lo que anuncia un lector de pantalla al llegar a cada escalón. */
  protected descripcion(e: Escalon): string {
    const nombres = e.participantes.map((p) => p.nick).join(' y ');
    return `${e.puesto}.º, ${this.nombrePuesto(e.puesto)}: ${nombres}`;
  }
}

/** Duelo: el ganador arriba y el perdedor en el segundo escalón, cada uno con sus puntos. */
export function podioDelDuelo(d: Duelo): Escalon[] {
  return d.jugadores
    .map((j) => ({
      puesto: (j.participante.id === d.id_ganador ? 1 : 2) as 1 | 2,
      participantes: [j.participante],
      resultado: j.resultado,
    }))
    .sort((a, b) => a.puesto - b.puesto);
}

/** Combate sin duelo (ganador elegido a mano): los mismos escalones, sin puntos. */
export function podioDelCombate(t: TorneoDetalle, c: Combate): Escalon[] {
  const conIcono = (p: ParticipanteResumen): ParticipanteResumen => ({
    ...p,
    icono: t.participantes.find((i) => i.id === p.id)?.icono ?? null,
  });
  return [c.participante1, c.participante2]
    .filter((p): p is ParticipanteResumen => p !== null)
    .map((p) => ({
      puesto: (p.id === c.id_ganador ? 1 : 2) as 1 | 2,
      participantes: [conIcono(p)],
    }))
    .sort((a, b) => a.puesto - b.puesto);
}

/**
 * Torneo terminado: campeón (gana la final), subcampeón (pierde la final) y en el tercer
 * escalón los que perdieron las semifinales (uno o dos; con BYE puede haber uno solo).
 */
export function podioDelTorneo(t: TorneoDetalle): Escalon[] {
  // El icono viene en la lista de inscritos; el cuadro solo trae id, nick y logo
  const conIcono = (p: ParticipanteResumen): ParticipanteResumen => ({
    ...p,
    icono: t.participantes.find((i) => i.id === p.id)?.icono ?? null,
  });
  const perdedor = (c: {
    participante1: ParticipanteResumen;
    participante2: ParticipanteResumen | null;
    id_ganador: number | null;
  }) => (c.id_ganador === c.participante1.id ? c.participante2 : c.participante1);

  const final = t.combates.find((c) => c.ronda === t.total_rondas);
  if (!final || final.id_ganador === null || final.participante2 === null) return [];
  const campeon =
    final.id_ganador === final.participante1.id ? final.participante1 : final.participante2;
  const escalones: Escalon[] = [
    { puesto: 1, participantes: [conIcono(campeon)] },
    { puesto: 2, participantes: [conIcono(perdedor(final)!)] },
  ];
  const semifinalistas = t.combates
    .filter((c) => c.ronda === t.total_rondas - 1 && !c.es_bye && c.id_ganador !== null)
    .map((c) => conIcono(perdedor(c)!));
  if (semifinalistas.length > 0) {
    escalones.push({ puesto: 3, participantes: semifinalistas });
  }
  return escalones;
}
