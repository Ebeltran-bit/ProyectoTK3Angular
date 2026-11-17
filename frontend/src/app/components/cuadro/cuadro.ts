import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { iconoDe } from '../../models/iconos';
import { Participante } from '../../models/participante';
import { Combate, nombreRonda, ParticipanteResumen } from '../../models/torneo';
import { IconoUsuario } from '../icono-usuario/icono-usuario';

/** Lo que emite el cuadro cuando se pulsa el ganador de un combate. */
export interface GanadorElegido {
  combate: Combate;
  ganador: ParticipanteResumen;
}

interface Ronda {
  numero: number;
  nombre: string;
  /** Combates de dos en dos, en el orden del cuadro; null = hueco que aún no existe. */
  parejas: (Combate | null)[][];
  esFinal: boolean;
}

/** Color de la cabecera de cada ronda, contando desde la final hacia atrás. */
const COLORES = ['var(--azul)', 'var(--coral)', 'var(--amarillo-oscuro)', 'var(--menta-oscuro)'];

/**
 * Dibuja el cuadro KO (rediseño aprobado por Eva el 17/11/2026): una columna por ronda, cada
 * combate con los iconos, y líneas que unen cada pareja de combates con el de la ronda
 * siguiente. En los pendientes hay un botón a su duelo de ritmo y otro para elegir el
 * ganador a mano.
 * Solo muestra datos y avisa de los clics; no llama a la API (eso lo hace la pantalla).
 */
@Component({
  selector: 'app-cuadro',
  imports: [RouterLink, IconoUsuario],
  templateUrl: './cuadro.html',
  styleUrl: './cuadro.css',
})
export class Cuadro {
  readonly combates = input.required<Combate[]>();
  readonly totalRondas = input.required<number>();
  /** Inscritos: de aquí sale el icono de cada uno (el combate solo trae id y nick). */
  readonly participantes = input<Participante[]>([]);
  /** Si es true, los combates pendientes enseñan sus botones. */
  readonly editable = input(false);
  readonly ganadorElegido = output<GanadorElegido>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Combate en el que se está eligiendo ganador a mano (sus dos filas se vuelven botones). */
  protected readonly eligiendo = signal<number | null>(null);

  protected readonly rondas = computed<Ronda[]>(() => {
    const total = this.totalRondas();
    const rondas: Ronda[] = [];
    for (let numero = 1; numero <= total; numero++) {
      // La ronda n tiene 2^(total - n) combates; cada uno va en su posición (desde 0)
      const huecos: (Combate | null)[] = Array(2 ** (total - numero)).fill(null);
      for (const c of this.combates()) if (c.ronda === numero) huecos[c.posicion] = c;
      const parejas = [];
      for (let i = 0; i < huecos.length; i += 2) parejas.push(huecos.slice(i, i + 2));
      rondas.push({
        numero,
        nombre: nombreRonda(numero, total),
        parejas,
        esFinal: numero === total,
      });
    }
    return rondas;
  });

  protected color(ronda: Ronda): string {
    return COLORES[(this.totalRondas() - ronda.numero) % COLORES.length];
  }

  protected icono(p: ParticipanteResumen): string {
    const inscrito = this.participantes().find((i) => i.id === p.id);
    return iconoDe({ id: p.id, icono: inscrito?.icono ?? null });
  }

  protected pendiente(c: Combate): boolean {
    return c.estado === 'pendiente' && c.participante2 !== null;
  }

  /**
   * Abre o cierra el modo «elegir ganador». El botón pulsado desaparece al cambiar de modo, así
   * que el foco pasa al primer botón nuevo del combate para no perderlo con el teclado.
   */
  protected cambiarEligiendo(id: number | null, combate: number): void {
    this.eligiendo.set(id);
    const destino = id === null ? 'button.elegir' : 'button.fila';
    setTimeout(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-combate="${combate}"] ${destino}`)
        ?.focus(),
    );
  }

  protected elegir(combate: Combate, ganador: ParticipanteResumen): void {
    this.eligiendo.set(null);
    this.ganadorElegido.emit({ combate, ganador });
  }
}
