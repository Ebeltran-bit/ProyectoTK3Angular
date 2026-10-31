import { Component, computed, input, output } from '@angular/core';

import { Combate, nombreRonda, ParticipanteResumen } from '../../models/torneo';

/** Lo que emite el cuadro cuando se pulsa el ganador de un combate. */
export interface GanadorElegido {
  combate: Combate;
  ganador: ParticipanteResumen;
}

interface Ronda {
  numero: number;
  nombre: string;
  combates: Combate[];
  /** Huecos de combates que todavía no existen (rondas futuras). */
  pendientes: number;
}

/**
 * Dibuja el cuadro KO: una columna por ronda.
 * Solo muestra datos y avisa de los clics; no llama a la API (eso lo hace la pantalla).
 */
@Component({
  selector: 'app-cuadro',
  templateUrl: './cuadro.html',
  styleUrl: './cuadro.css',
})
export class Cuadro {
  readonly combates = input.required<Combate[]>();
  readonly totalRondas = input.required<number>();
  /** Si es true, en los combates pendientes se puede pulsar el nombre del ganador. */
  readonly editable = input(false);
  readonly ganadorElegido = output<GanadorElegido>();

  protected readonly rondas = computed<Ronda[]>(() => {
    const total = this.totalRondas();
    const rondas: Ronda[] = [];
    for (let numero = 1; numero <= total; numero++) {
      const combates = this.combates().filter((c) => c.ronda === numero);
      // La ronda n tiene 2^(total - n) combates
      const esperados = 2 ** (total - numero);
      rondas.push({
        numero,
        nombre: nombreRonda(numero, total),
        combates,
        pendientes: Math.max(esperados - combates.length, 0),
      });
    }
    return rondas;
  });

  protected elegir(combate: Combate, ganador: ParticipanteResumen): void {
    this.ganadorElegido.emit({ combate, ganador });
  }

  protected huecos(cantidad: number): number[] {
    return Array.from({ length: cantidad }, (_, i) => i);
  }
}
