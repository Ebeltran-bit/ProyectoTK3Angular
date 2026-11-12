import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { Pulsacion } from '../models/cancion';
import { Duelo } from '../models/duelo';

/** Duelo de ritmo de un combate del torneo. Quién gana lo decide el backend. */
@Injectable({ providedIn: 'root' })
export class DuelosService {
  private readonly http = inject(HttpClient);

  private url(idTorneo: number, idCombate: number): string {
    return `${API_URL}/torneos/${idTorneo}/combates/${idCombate}/duelo`;
  }

  /**
   * La primera vez, el backend elige la canción según la ronda. Si el rival no tiene
   * cuenta (un bot), la IA toca por él en esta misma petición.
   */
  obtener(idTorneo: number, idCombate: number): Observable<Duelo> {
    return this.http.get<Duelo>(this.url(idTorneo, idCombate));
  }

  /** Manda las pulsaciones del usuario de la sesión. */
  jugar(idTorneo: number, idCombate: number, pulsaciones: Pulsacion[]): Observable<Duelo> {
    return this.http.post<Duelo>(this.url(idTorneo, idCombate), { pulsaciones });
  }
}
