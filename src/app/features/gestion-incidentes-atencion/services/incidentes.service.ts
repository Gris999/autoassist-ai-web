import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

export interface AnalisisIncidenteResponse {
  id_incidente: number;
  clasificacion_ia: string;
  confianza_clasificacion: number;
  prioridad: string;
  resumen_ia: string;
  requiere_mas_info: boolean;
  preguntas_sugeridas: string[];
}

@Injectable({
  providedIn: 'root'
})
export class IncidentesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getIncidentesDisponibles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/incidentes/disponibles`);
  }

  analizarIncidente(idIncidente: number): Observable<AnalisisIncidenteResponse> {
    return this.http.post<AnalisisIncidenteResponse>(
      `${this.apiUrl}/inteligencia/incidentes/${idIncidente}/analizar`,
      {}
    );
  }
}
