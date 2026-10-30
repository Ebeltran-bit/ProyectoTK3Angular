/**
 * Traduce el teclado a la Entrada del motor.
 * Moverse, saltar y bloquear cuentan mientras la tecla está pulsada;
 * los golpes solo el tick en que se pulsa, para que mantener J no sea
 * una lluvia de puñetazos.
 */
import { Entrada } from './motor/combate';

export const TECLAS = {
  izquierda: 'KeyA',
  derecha: 'KeyD',
  saltar: 'KeyW',
  bloquear: 'KeyS',
  punetazo: 'KeyJ',
  patada: 'KeyK',
  especial: 'KeyL',
} as const;

const CODIGOS = new Set<string>(Object.values(TECLAS));

export class Teclado {
  private readonly mantenidas = new Set<string>();
  private readonly recienPulsadas = new Set<string>();

  /** Devuelve true si la tecla es del juego (para evitar que haga scroll, por ejemplo). */
  pulsar(codigo: string, repetida: boolean): boolean {
    if (!CODIGOS.has(codigo)) return false;
    if (!repetida) this.recienPulsadas.add(codigo);
    this.mantenidas.add(codigo);
    return true;
  }

  soltar(codigo: string): void {
    this.mantenidas.delete(codigo);
  }

  /** Al perder el foco de la ventana se sueltan todas, para que nadie se quede andando solo. */
  soltarTodas(): void {
    this.mantenidas.clear();
    this.recienPulsadas.clear();
  }

  /** Lee la entrada de este tick y olvida los golpes ya usados. */
  leer(): Entrada {
    const entrada: Entrada = {
      izquierda: this.mantenidas.has(TECLAS.izquierda),
      derecha: this.mantenidas.has(TECLAS.derecha),
      saltar: this.mantenidas.has(TECLAS.saltar),
      bloquear: this.mantenidas.has(TECLAS.bloquear),
      punetazo: this.recienPulsadas.has(TECLAS.punetazo),
      patada: this.recienPulsadas.has(TECLAS.patada),
      especial: this.recienPulsadas.has(TECLAS.especial),
    };
    this.recienPulsadas.clear();
    return entrada;
  }
}
