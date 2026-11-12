import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Confirmacion } from '../../components/confirmacion/confirmacion';
import { Cuadro, GanadorElegido } from '../../components/cuadro/cuadro';
import { Combate, NOMBRE_ESTADO, nombreRonda, TorneoDetalle as Torneo } from '../../models/torneo';
import { mensajeError } from '../../services/mensaje-error';
import { TorneosService } from '../../services/torneos.service';
import { PantallaCarga } from '../../components/pantalla-carga/pantalla-carga';

/** Lo que pregunta la ventana de confirmación y qué hacer si se acepta. */
interface Pregunta {
  titulo: string;
  texto: string;
  textoAceptar: string;
  alAceptar: () => void;
}

@Component({
  selector: 'app-torneo-detalle',
  imports: [RouterLink, Cuadro, Confirmacion, PantallaCarga],
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
  /** Pregunta que se está enseñando en la ventana de confirmación (null = ninguna). */
  protected readonly pregunta = signal<Pregunta | null>(null);

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

  /** El usuario dice que sí en la ventana: se cierra y se hace lo que se preguntaba. */
  protected confirmar(): void {
    const p = this.pregunta();
    this.pregunta.set(null);
    p?.alAceptar();
  }

  generarCuadro(): void {
    this.pregunta.set({
      titulo: '¿Sorteamos el cuadro?',
      texto: 'Una vez generado, ya no se podrán cambiar los participantes del torneo.',
      textoAceptar: '¡Generar cuadro!',
      alAceptar: () => this.sortear(),
    });
  }

  private sortear(): void {
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
    this.pregunta.set({
      titulo: `¿Gana ${ganador.nick}?`,
      texto: 'El resultado de este combate no se podrá cambiar.',
      textoAceptar: `Sí, gana ${ganador.nick}`,
      alAceptar: () => this.guardarGanador({ combate, ganador }),
    });
  }

  private guardarGanador({ combate, ganador }: GanadorElegido): void {
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
