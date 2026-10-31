import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { EstadisticaParticipante, RecordsCancion } from '../models/estadistica';

/** Peticiones de informes. Los cálculos los hace el backend. */
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/estadisticas`;

  porParticipante(): Observable<EstadisticaParticipante[]> {
    return this.http.get<EstadisticaParticipante[]>(`${this.url}/participantes`);
  }

  recordsPorCancion(): Observable<RecordsCancion[]> {
    return this.http.get<RecordsCancion[]>(`${this.url}/canciones`);
  }
}
