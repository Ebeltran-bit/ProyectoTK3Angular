import { Component, computed, input } from '@angular/core';

import { Combate } from '../../models/torneo';

interface Ronda {
  numero: number;
  nombre: string;
  combates: Combate[];
  /** Huecos de combates que todavía no existen (rondas futuras). */
  pendientes: number;
}

/** Dibuja el cuadro KO: una columna por ronda. Solo muestra datos; no llama a la API. */
@Component({
  selector: 'app-cuadro',
  templateUrl: './cuadro.html',
  styleUrl: './cuadro.css',
})
export class Cuadro {
  readonly combates = input.required<Combate[]>();
  readonly totalRondas = input.required<number>();

  protected readonly rondas = computed<Ronda[]>(() => {
    const total = this.totalRondas();
    const rondas: Ronda[] = [];
    for (let numero = 1; numero <= total; numero++) {
      const combates = this.combates().filter((c) => c.ronda === numero);
      // La ronda n tiene 2^(total - n) combates
      const esperados = 2 ** (total - numero);
      rondas.push({
        numero,
        nombre: this.nombreRonda(numero, total),
        combates,
        pendientes: Math.max(esperados - combates.length, 0),
      });
    }
    return rondas;
  });

  private nombreRonda(numero: number, total: number): string {
    const quedan = total - numero;
    if (quedan === 0) return 'Final';
    if (quedan === 1) return 'Semifinales';
    if (quedan === 2) return 'Cuartos de final';
    return `Ronda ${numero}`;
  }

  protected huecos(cantidad: number): number[] {
    return Array.from({ length: cantidad }, (_, i) => i);
  }
}
