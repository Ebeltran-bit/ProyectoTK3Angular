import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, Observable, of, tap } from 'rxjs';

import { API_URL } from '../api.config';
import { Credenciales, Sesion, Usuario } from '../models/usuario';

const CLAVE_TOKEN = 'tk3_token';

/**
 * Sesión del usuario. Guarda el token en el navegador (localStorage) para
 * que la sesión siga abierta al recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/auth`;

  readonly usuario = signal<Usuario | null>(null);
  readonly conectado = computed(() => this.usuario() !== null);

  get token(): string | null {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  }

  registrar(datos: Credenciales): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.url}/registro`, datos).pipe(tap((s) => this.guardar(s)));
  }

  iniciarSesion(datos: Credenciales): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.url}/login`, datos).pipe(tap((s) => this.guardar(s)));
  }

  cerrarSesion(): Observable<unknown> {
    return this.http.post(`${this.url}/logout`, {}).pipe(
      catchError(() => of(null)), // aunque falle la API, cerramos la sesión en el navegador
      tap(() => this.olvidar()),
    );
  }

  /** Al arrancar la app: si hay token guardado, comprueba que sigue siendo válido. */
  restaurar(): Promise<unknown> {
    if (!this.token) {
      return Promise.resolve();
    }
    return firstValueFrom(
      this.http.get<Usuario>(`${this.url}/yo`).pipe(
        tap((u) => this.usuario.set(u)),
        catchError(() => {
          this.olvidar();
          return of(null);
        }),
      ),
    );
  }

  /** Borra la sesión del navegador (por ejemplo, si la API dice que ha caducado). */
  olvidar(): void {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // sin acceso a localStorage: no hay nada que borrar
    }
    this.usuario.set(null);
  }

  private guardar(sesion: Sesion): void {
    try {
      localStorage.setItem(CLAVE_TOKEN, sesion.token);
    } catch {
      // sin localStorage la sesión dura hasta recargar
    }
    this.usuario.set(sesion.usuario);
  }
}
