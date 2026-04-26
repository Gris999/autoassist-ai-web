import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AnalisisIncidenteResponse,
  IncidentesService,
} from '../../services/incidentes.service';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [RouterLink],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.scss',
})
export class DetalleSolicitud {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incidentesService = inject(IncidentesService);

  readonly idIncidente = Number(this.route.snapshot.paramMap.get('id'));
  readonly loadingAnalysis = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly analysis = signal<AnalisisIncidenteResponse | null>(null);
  readonly isTechnicianView = computed(() => this.router.url.startsWith('/tecnico'));
  readonly backRoute = computed(() =>
    this.isTechnicianView() ? '/tecnico/asignaciones' : '/taller/solicitudes'
  );

  readonly confidencePercent = computed(() => {
    const confidence = this.analysis()?.confianza_clasificacion ?? 0;
    return Math.round(Math.max(0, Math.min(confidence, 1)) * 100);
  });

  analizarIncidente(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!Number.isFinite(this.idIncidente) || this.idIncidente <= 0) {
      this.errorMessage.set('No se encontro un identificador valido para el incidente.');
      return;
    }

    this.loadingAnalysis.set(true);

    this.incidentesService
      .analizarIncidente(this.idIncidente)
      .pipe(finalize(() => this.loadingAnalysis.set(false)))
      .subscribe({
        next: (response) => {
          this.analysis.set(response);
          this.successMessage.set('Analisis completado correctamente.');
        },
        error: () => {
          this.errorMessage.set('No fue posible analizar el incidente en este momento.');
        },
      });
  }

  getPriorityClass(priority: string | undefined): string {
    const normalized = this.normalizePriority(priority);
    return `priority-badge priority-badge--${normalized}`;
  }

  getPriorityLabel(priority: string | undefined): string {
    if (!priority) {
      return 'N/D';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  }

  private normalizePriority(priority: string | undefined): string {
    const normalized = (priority ?? '').toLowerCase();

    if (['baja', 'media', 'alta', 'critica'].includes(normalized)) {
      return normalized;
    }

    return 'default';
  }
}
