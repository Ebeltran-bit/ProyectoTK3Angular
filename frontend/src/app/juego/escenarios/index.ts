import { bar } from './bar';
import { correos } from './correos';
import { huerto } from './huerto';
import { patitos } from './patitos';
import { puerto } from './puerto';
import { ramen } from './ramen';
import { Escenario } from './tipos';

/** Escenarios disponibles por su id (el campo `escenario` del beatmap). */
export const ESCENARIOS: Record<string, Escenario> = {
  puerto,
  bar,
  huerto,
  ramen,
  correos,
  patitos,
};
