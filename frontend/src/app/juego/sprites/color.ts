/** Utilidades de color para sombrear los sprites. */

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** factor 0.2 = un 20 % más oscuro. */
export function oscurecer(hex: string, factor: number): string {
  return aHex(aRgb(hex).map((v) => v * (1 - factor)));
}

/** factor 0.2 = un 20 % más cerca del blanco. */
export function aclarar(hex: string, factor: number): string {
  return aHex(aRgb(hex).map((v) => v + (255 - v) * factor));
}
