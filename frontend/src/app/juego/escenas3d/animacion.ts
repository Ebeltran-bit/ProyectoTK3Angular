/**
 * Curvas de movimiento del juego en 3D. Son funciones puras (solo números), así se pueden
 * probar con Vitest sin navegador. Casi todas reciben un avance k entre 0 y 1.
 */

/** Deja x entre a y b. */
export function limitar(x: number, a = 0, b = 1): number {
  return Math.min(b, Math.max(a, x));
}

/** Punto intermedio entre a y b (k = 0 da a, k = 1 da b). */
export function mezclar(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Avance de 0 a 1 de x mientras va de `desde` a `hasta` (también sirve si `desde` es mayor). */
export function tramo(x: number, desde: number, hasta: number): number {
  return limitar((x - desde) / (hasta - desde));
}

/** Arranca y termina despacio: para movimientos tranquilos. */
export function suave(k: number): number {
  return k * k * (3 - 2 * k);
}

/** Sale rápido y frena al llegar: para algo que se lanza. */
export function frenar(k: number): number {
  return 1 - (1 - k) ** 3;
}

/** Llega, se pasa un poco y vuelve: da el «rebote» de los dibujos animados. */
export function rebote(k: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
}

/**
 * Sacudida que empieza en 1 y se apaga en `duracion` segundos (0 antes y después).
 * Sirve para las reacciones: aplastarse al aterrizar, encogerse con un fallo…
 */
export function golpe(desde: number, duracion: number): number {
  if (desde < 0 || desde >= duracion) return 0;
  return (1 - desde / duracion) ** 2;
}

/**
 * Acerca un valor a su objetivo un poco en cada fotograma. Con la exponencial el
 * resultado es el mismo vaya el juego a 30 o a 60 fotogramas por segundo.
 */
export function acercar(actual: number, objetivo: number, rapidez: number, dt: number): number {
  return objetivo + (actual - objetivo) * Math.exp(-rapidez * dt);
}

/**
 * Parpadeo: cuánto se cierran los ojos (0 abiertos, 1 cerrados) en el segundo t.
 * Parpadea una vez cada `cada` segundos y el cierre dura 0,14 s.
 */
export function parpadeo(t: number, cada = 3.4, desfase = 0): number {
  const fase = (((t + desfase) % cada) + cada) % cada;
  const k = fase / 0.14;
  return k >= 1 ? 0 : Math.sin(k * Math.PI);
}

/** Altura de un salto en arco: 0 al salir y al llegar, 1 en el punto más alto. */
export function arco(k: number): number {
  return 4 * k * (1 - k);
}
