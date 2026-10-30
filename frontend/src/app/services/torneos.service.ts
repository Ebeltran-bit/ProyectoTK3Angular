import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { TorneoDetalle, TorneoEntrada, TorneoResumen } from '../models/torneo';

/** Toda la comunicación con la API de torneos pasa por aquí. */
@Injectable({ providedIn: 'root' })
export class TorneosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/torneos`;

  listar(): Observable<TorneoResumen[]> {
    return this.http.get<TorneoResumen[]>(this.url);
  }

  obtener(id: number): Observable<TorneoDetalle> {
    return this.http.get<TorneoDetalle>(`${this.url}/${id}`);
  }

  crear(datos: TorneoEntrada): Observable<TorneoDetalle> {
    return this.http.post<TorneoDetalle>(this.url, datos);
  }

  editar(id: number, datos: TorneoEntrada): Observable<TorneoDetalle> {
    return this.http.put<TorneoDetalle>(`${this.url}/${id}`, datos);
  }

  /** Sortea la primera ronda. El sorteo lo hace el backend. */
  generarCuadro(id: number): Observable<TorneoDetalle> {
    return this.http.post<TorneoDetalle>(`${this.url}/${id}/cuadro`, {});
  }
}
