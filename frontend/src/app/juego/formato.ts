/** Puntos con un espacio fino cada tres cifras: 12 400. Lo usan el marcador y las tarjetas. */
export function conEspacios(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+$)/g, ' ');
}
