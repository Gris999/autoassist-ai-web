import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { IncidentesService } from '../../services/incidentes.service';

@Component({
  selector: 'app-solicitudes-disponibles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './solicitudes-disponibles.html',
  styleUrl: './solicitudes-disponibles.scss',
})
export class SolicitudesDisponibles implements OnInit {
  private incidentesService = inject(IncidentesService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';
  incidentes: any[] = [];
  readonly prioridadLabels: Record<string, string> = {
    '1': 'Alta',
    '2': 'Media',
    '3': 'Baja',
  };

  getPriorityLabel(priority: unknown): string {
    const key = `${priority ?? ''}`;
    return this.prioridadLabels[key] || key || 'N/D';
  }

  ngOnInit(): void {
    this.cargarIncidentes();
  }

  cargarIncidentes(): void {
    this.loading = true;
    this.errorMessage = '';

    this.incidentesService.getIncidentesDisponibles().subscribe({
      next: (response) => {
        this.incidentes = response ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = 'No se pudieron cargar los incidentes disponibles.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
