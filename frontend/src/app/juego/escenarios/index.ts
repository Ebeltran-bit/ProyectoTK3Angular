import { dibujarPuerto } from './puerto';
import { DibujarEscena } from './tipos';

/** Escenarios disponibles por su id (el campo `escenario` del beatmap). */
export const ESCENARIOS: Record<string, DibujarEscena> = {
  puerto: dibujarPuerto,
};
