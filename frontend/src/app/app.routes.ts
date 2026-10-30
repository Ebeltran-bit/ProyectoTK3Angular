import { Routes } from '@angular/router';

import { ParticipanteForm } from './pages/participante-form/participante-form';
import { ParticipantesLista } from './pages/participantes-lista/participantes-lista';

export const routes: Routes = [
  { path: '', redirectTo: 'participantes', pathMatch: 'full' },
  { path: 'participantes', component: ParticipantesLista },
  { path: 'participantes/nuevo', component: ParticipanteForm },
  { path: 'participantes/:id/editar', component: ParticipanteForm },
  { path: '**', redirectTo: 'participantes' },
];
