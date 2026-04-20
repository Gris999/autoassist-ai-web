import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IncidentesService } from '../../services/incidentes.service';

@Component({
  selector: 'app-solicitudes-disponibles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes-disponibles.html',
  styleUrl: './solicitudes-disponibles.scss',
})
export class SolicitudesDisponibles implements OnInit {
  private incidentesService = inject(IncidentesService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';
  incidentes: any[] = [];

  ngOnInit(): void {
    this.cargarIncidentes();
  }

  cargarIncidentes(): void {
    this.loading = true;
    this.errorMessage = '';

    this.incidentesService.getIncidentesDisponibles().subscribe({
      next: (response) => {
        console.log('Incidentes disponibles:', response);
        this.incidentes = response ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar incidentes:', error);
        this.errorMessage = 'No se pudieron cargar los incidentes disponibles.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}