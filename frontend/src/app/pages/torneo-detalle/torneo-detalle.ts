import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Cuadro, GanadorElegido } from '../../components/cuadro/cuadro';
import { Combate, NOMBRE_ESTADO, nombreRonda, TorneoDetalle as Torneo } from '../../models/torneo';
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
  protected readonly registrando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreEstado = NOMBRE_ESTADO;

  /** Historial de combates agrupado por rondas, en el orden del cuadro (fase 4). */
  protected readonly historial = computed(() => {
    const t = this.torneo();
    if (!t) return [];
    return Array.from({ length: t.total_rondas }, (_, i) => i + 1)
      .map((ronda) => ({
        nombre: nombreRonda(ronda, t.total_rondas),
        combates: t.combates.filter((c) => c.ronda === ronda),
      }))
      .filter((r) => r.combates.length > 0);
  });

  /** Frase de una línea del historial: quién ganó a quién, BYE o pendiente. */
  protected resultado(c: Combate): string {
    if (c.es_bye) return `${c.participante1.nick} pasa por BYE`;
    const rival = c.participante2!;
    if (c.id_ganador === null) return `${c.participante1.nick} contra ${rival.nick} · pendiente`;
    const [ganador, perdedor] =
      c.id_ganador === c.participante1.id ? [c.participante1, rival] : [rival, c.participante1];
    return `${ganador.nick} gana a ${perdedor.nick}`;
  }

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

  registrarGanador({ combate, ganador }: GanadorElegido): void {
    if (this.registrando()) {
      return;
    }
    if (
      !confirm(
        `¿Confirmas que ${ganador.nick} gana este combate? El resultado no se podrá cambiar.`,
      )
    ) {
      return;
    }
    this.registrando.set(true);
    this.error.set(null);
    this.servicio.registrarGanador(this.id, combate.id, ganador.id).subscribe({
      next: (t) => {
        this.torneo.set(t);
        this.registrando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.registrando.set(false);
      },
    });
  }
}
