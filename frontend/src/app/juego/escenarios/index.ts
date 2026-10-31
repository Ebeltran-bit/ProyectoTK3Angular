import { bar } from './bar';
import { correos } from './correos';
import { huerto } from './huerto';
import { mecanografa } from './mecanografa';
import { observatorio } from './observatorio';
import { patitos } from './patitos';
import { puerto } from './puerto';
import { ramen } from './ramen';
import { tejado } from './tejado';
import { Escenario } from './tipos';

/** Escenarios disponibles por su id (el campo `escenario` del beatmap). */
export const ESCENARIOS: Record<string, Escenario> = {
  puerto,
  bar,
  huerto,
  ramen,
  correos,
  patitos,
  observatorio,
  tejado,
  mecanografa,
};
