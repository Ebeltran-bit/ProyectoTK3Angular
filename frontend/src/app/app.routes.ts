import { Routes } from '@angular/router';

import { ParticipanteForm } from './pages/participante-form/participante-form';
import { ParticipantesLista } from './pages/participantes-lista/participantes-lista';
import { TorneoDetalle } from './pages/torneo-detalle/torneo-detalle';
import { TorneoForm } from './pages/torneo-form/torneo-form';
import { TorneosLista } from './pages/torneos-lista/torneos-lista';

export const routes: Routes = [
  { path: '', redirectTo: 'participantes', pathMatch: 'full' },
  { path: 'participantes', component: ParticipantesLista },
  { path: 'participantes/nuevo', component: ParticipanteForm },
  { path: 'participantes/:id/editar', component: ParticipanteForm },
  { path: 'torneos', component: TorneosLista },
  { path: 'torneos/nuevo', component: TorneoForm },
  { path: 'torneos/:id', component: TorneoDetalle },
  { path: 'torneos/:id/editar', component: TorneoForm },
  { path: '**', redirectTo: 'participantes' },
];
