import { bar } from './bar';
import { huerto } from './huerto';
import { puerto } from './puerto';
import { Escenario } from './tipos';

/** Escenarios disponibles por su id (el campo `escenario` del beatmap). */
export const ESCENARIOS: Record<string, Escenario> = { puerto, bar, huerto };
