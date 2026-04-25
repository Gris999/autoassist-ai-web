import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
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
}
