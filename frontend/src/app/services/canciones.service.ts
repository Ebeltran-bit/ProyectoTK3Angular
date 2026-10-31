import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { Cancion, CancionResumen, Pulsacion, Resultado } from '../models/cancion';

/** Pide las canciones del duelo de ritmo a la API. */
@Injectable({ providedIn: 'root' })
export class CancionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/canciones`;

  listar(): Observable<CancionResumen[]> {
    return this.http.get<CancionResumen[]>(this.url);
  }

  obtener(id: string): Observable<Cancion> {
    return this.http.get<Cancion>(`${this.url}/${id}`);
  }

  /** Manda las pulsaciones de una partida; el backend calcula la puntuación y la guarda. */
  guardarPartida(id: string, pulsaciones: Pulsacion[]): Observable<Resultado> {
    return this.http.post<Resultado>(`${this.url}/${id}/partidas`, { pulsaciones });
  }
}
