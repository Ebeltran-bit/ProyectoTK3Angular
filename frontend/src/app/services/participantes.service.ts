import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { Participante, ParticipanteEntrada } from '../models/participante';

/** Toda la comunicación con la API de participantes pasa por aquí. */
@Injectable({ providedIn: 'root' })
export class ParticipantesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/participantes`;

  /** Lista participantes. Sin argumento devuelve todos; con true/false filtra por estado. */
  listar(activo?: boolean): Observable<Participante[]> {
    let params = new HttpParams();
    if (activo !== undefined) {
      params = params.set('activo', activo);
    }
    return this.http.get<Participante[]>(this.url, { params });
  }

  obtener(id: number): Observable<Participante> {
    return this.http.get<Participante>(`${this.url}/${id}`);
  }

  crear(datos: ParticipanteEntrada): Observable<Participante> {
    return this.http.post<Participante>(this.url, datos);
  }

  editar(id: number, datos: ParticipanteEntrada): Observable<Participante> {
    return this.http.put<Participante>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Participante> {
    return this.http.patch<Participante>(`${this.url}/${id}/estado`, { activo });
  }
}
