import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Añade el token a cada petición a la API y, si la API responde 401
 * (sesión caducada o inválida), cierra la sesión y lleva al login.
 */
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const conToken = token
    ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : peticion;

  return siguiente(conToken).pipe(
    catchError((error: unknown) => {
      const esLogin =
        peticion.url.includes('/auth/login') || peticion.url.includes('/auth/registro');
      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin) {
        auth.olvidar();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
