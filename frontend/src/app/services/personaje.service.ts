import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../api.config';
import { Apariencia } from '../juego/sprites/apariencia';

/** Personaje del usuario con sesión: su aspecto más su participante. */
export interface Personaje extends Apariencia {
  id_participante: number;
  nick: string;
}

@Injectable({ providedIn: 'root' })
export class PersonajeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/personaje`;

  obtener(): Observable<Personaje> {
    return this.http.get<Personaje>(this.url);
  }

  guardar(apariencia: Apariencia): Observable<Personaje> {
    return this.http.put<Personaje>(this.url, apariencia);
  }
}
