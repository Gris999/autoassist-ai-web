import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
import {
  ActualizarTecnicoRequest,
  CambiarEstadoTecnicoResponse,
  CrearTecnicoRequest,
  Especialidad,
  EspecialidadesRequest,
  EspecialidadesTecnicoResponse,
  TecnicoDetalle,
  TecnicoResumen,
} from '../models/technician-management.model';
import {
  UpdateWorkshopAvailabilityRequest,
  WorkshopAvailability,
} from '../models/workshop-availability.model';

@Injectable({
  providedIn: 'root',
})
export class WorkshopOperationalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAvailability(): Observable<WorkshopAvailability> {
    return this.http.get<WorkshopAvailability>(
      `${this.apiUrl}/operativo/taller/disponibilidad`
    );
  }

  updateAvailability(
    payload: UpdateWorkshopAvailabilityRequest
  ): Observable<WorkshopAvailability> {
    return this.http.put<WorkshopAvailability>(
      `${this.apiUrl}/operativo/taller/disponibilidad`,
      payload
    );
  }

  getTecnicos(): Observable<TecnicoResumen[]> {
    return this.http.get<TecnicoResumen[]>(
      `${this.apiUrl}/operativo/taller/tecnicos`
    );
  }

  getTecnicoDetalle(idTecnico: number): Observable<TecnicoDetalle> {
    return this.http.get<TecnicoDetalle>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}`
    );
  }

  registrarTecnico(payload: CrearTecnicoRequest): Observable<TecnicoDetalle> {
    return this.http.post<TecnicoDetalle>(
      `${this.apiUrl}/operativo/taller/tecnicos`,
      payload
    );
  }

  actualizarTecnico(
    idTecnico: number,
    payload: ActualizarTecnicoRequest
  ): Observable<TecnicoDetalle> {
    return this.http.put<TecnicoDetalle>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}`,
      payload
    );
  }

  habilitarTecnico(idTecnico: number): Observable<CambiarEstadoTecnicoResponse> {
    return this.http.patch<CambiarEstadoTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/habilitar`,
      {}
    );
  }

  deshabilitarTecnico(idTecnico: number): Observable<CambiarEstadoTecnicoResponse> {
    return this.http.patch<CambiarEstadoTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/deshabilitar`,
      {}
    );
  }

  getCatalogoEspecialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(
      `${this.apiUrl}/operativo/taller/especialidades`
    );
  }

  getEspecialidadesTecnico(
    idTecnico: number
  ): Observable<EspecialidadesTecnicoResponse> {
    return this.http.get<EspecialidadesTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/especialidades`
    );
  }

  asignarEspecialidadesTecnico(
    idTecnico: number,
    idsEspecialidad: number[]
  ): Observable<EspecialidadesTecnicoResponse> {
    const payload: EspecialidadesRequest = {
      ids_especialidad: idsEspecialidad,
    };

    return this.http.post<EspecialidadesTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/especialidades`,
      payload
    );
  }

  reemplazarEspecialidadesTecnico(
    idTecnico: number,
    idsEspecialidad: number[]
  ): Observable<EspecialidadesTecnicoResponse> {
    const payload: EspecialidadesRequest = {
      ids_especialidad: idsEspecialidad,
    };

    return this.http.put<EspecialidadesTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/especialidades`,
      payload
    );
  }

  quitarEspecialidadTecnico(
    idTecnico: number,
    idEspecialidad: number
  ): Observable<EspecialidadesTecnicoResponse> {
    return this.http.delete<EspecialidadesTecnicoResponse>(
      `${this.apiUrl}/operativo/taller/tecnicos/${idTecnico}/especialidades/${idEspecialidad}`
    );
  }
}
