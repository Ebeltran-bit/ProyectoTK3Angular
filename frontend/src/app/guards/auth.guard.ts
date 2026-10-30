import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Solo deja entrar con sesión iniciada; si no, lleva al login. */
export const sesionRequerida: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.conectado() ? true : inject(Router).createUrlTree(['/login']);
};

/** Para login y registro: si ya hay sesión, lleva a la app. */
export const sinSesion: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.conectado() ? inject(Router).createUrlTree(['/participantes']) : true;
};
