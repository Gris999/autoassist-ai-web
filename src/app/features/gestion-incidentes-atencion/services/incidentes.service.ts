import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class IncidentesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getIncidentesDisponibles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/incidentes/disponibles`);
  }
}