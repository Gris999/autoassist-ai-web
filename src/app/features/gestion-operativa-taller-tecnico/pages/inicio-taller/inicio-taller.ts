import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IncidentesService } from '../../../gestion-incidentes-atencion/services/incidentes.service';

interface QuickAccess {
  title: string;
  description: string;
  helper: string;
  route: string;
}

@Component({
  selector: 'app-inicio-taller',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio-taller.html',
  styleUrl: './inicio-taller.scss',
})
export class InicioTaller implements OnInit {
  private readonly incidentesService = inject(IncidentesService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly incidentes = signal<any[]>([]);

  readonly metricCards = computed(() => {
    const incidentes = this.incidentes();
    return [
      {
        label: 'Solicitudes pendientes',
        value: incidentes.length,
        helper: 'listas para responder',
      },
      {
        label: 'Prioridad alta',
        value: incidentes.filter((item) => Number(item.id_prioridad) === 1).length,
        helper: 'casos urgentes',
      },
      {
        label: 'Tecnicos disponibles',
        value: 8,
        helper: 'operativos hoy',
      },
      {
        label: 'Unidades moviles',
        value: 5,
        helper: 'disponibles',
      },
    ];
  });

  readonly quickAccessCards: QuickAccess[] = [
    {
      title: 'Disponibilidad del taller',
      description: 'Define el estado operativo, cobertura y horarios de atencion.',
      helper: 'Operacion del taller',
      route: '/taller',
    },
    {
      title: 'Servicios ofrecidos',
      description: 'Organiza los auxilios que el taller tiene habilitados.',
      helper: 'Operacion del taller',
      route: '/taller',
    },
    {
      title: 'Tipos de vehiculo',
      description: 'Configura los vehiculos que el taller puede atender.',
      helper: 'Operacion del taller',
      route: '/taller',
    },
    {
      title: 'Incidentes disponibles',
      description: 'Revisa solicitudes pendientes y entra al detalle del caso.',
      helper: 'Incidentes y atencion',
      route: '/taller/solicitudes',
    },
    {
      title: 'Tecnicos y unidades',
      description: 'Administra personal, especialidades y unidades moviles.',
      helper: 'Tecnicos y unidades',
      route: '/taller',
    },
    {
      title: 'Seguimiento e historial',
      description: 'Consulta avances, notificaciones y trazabilidad del servicio.',
      helper: 'Seguimiento',
      route: '/taller',
    },
  ];

  readonly recentActivity = computed(() => {
    const firstIncident = this.incidentes()[0];
    if (!firstIncident) {
      return 'Aun no hay actividad reciente. Cuando ingresen solicitudes nuevas apareceran aqui.';
    }

    return `${firstIncident.titulo || 'Incidente sin titulo'} · Estado ${firstIncident.id_estado_servicio_actual || 'N/D'} · Prioridad ${firstIncident.id_prioridad || 'N/D'}`;
  });

  ngOnInit(): void {
    this.incidentesService.getIncidentesDisponibles().subscribe({
      next: (response) => {
        this.incidentes.set(response ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'No pudimos cargar el resumen operativo del taller.'
        );
        this.loading.set(false);
      },
    });
  }
}
