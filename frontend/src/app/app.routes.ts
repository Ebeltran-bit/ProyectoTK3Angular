import { Routes } from '@angular/router';

import { sesionRequerida, sinSesion } from './guards/auth.guard';
import { CombatePage } from './pages/combate/combate';
import { Login } from './pages/login/login';
import { ParticipanteForm } from './pages/participante-form/participante-form';
import { ParticipantesLista } from './pages/participantes-lista/participantes-lista';
import { PersonajeEditor } from './pages/personaje/personaje';
import { Registro } from './pages/registro/registro';
import { TorneoDetalle } from './pages/torneo-detalle/torneo-detalle';
import { TorneoForm } from './pages/torneo-form/torneo-form';
import { TorneosLista } from './pages/torneos-lista/torneos-lista';

export const routes: Routes = [
  // Públicas: solo sin sesión
  { path: 'login', component: Login, canActivate: [sinSesion] },
  { path: 'registro', component: Registro, canActivate: [sinSesion] },

  // El resto exige sesión
  {
    path: '',
    canActivateChild: [sesionRequerida],
    children: [
      { path: '', redirectTo: 'participantes', pathMatch: 'full' },
      { path: 'participantes', component: ParticipantesLista },
      { path: 'participantes/nuevo', component: ParticipanteForm },
      { path: 'participantes/:id/editar', component: ParticipanteForm },
      { path: 'torneos', component: TorneosLista },
      { path: 'torneos/nuevo', component: TorneoForm },
      { path: 'torneos/:id', component: TorneoDetalle },
      { path: 'torneos/:id/editar', component: TorneoForm },
      { path: 'personaje', component: PersonajeEditor },
      { path: 'combate', component: CombatePage },
    ],
  },
  { path: '**', redirectTo: 'participantes' },
];
