import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

import { IncidentesService } from '../../../gestion-incidentes-atencion/services/incidentes.service';
import { TokenService } from '../../../../core/services/token.service';
import { WorkshopAvailability } from '../../models/workshop-availability.model';
import { WorkshopOperationalService } from '../../services/workshop-operational.service';

interface QuickAccess {
  title: string;
  description: string;
  helper: string;
  route?: string;
  status?: 'available' | 'upcoming';
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
  private readonly workshopOperationalService = inject(WorkshopOperationalService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly incidentes = signal<any[]>([]);
  readonly availabilityLoading = signal(true);
  readonly availabilitySaving = signal(false);
  readonly availabilityError = signal('');
  readonly workshopAvailability = signal<WorkshopAvailability | null>(null);
  readonly metricsOpen = signal(true);
  readonly quickAccessOpen = signal(true);
  readonly activityOpen = signal(true);

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
      helper: 'Configuracion operativa',
      route: '/taller/disponibilidad',
      status: 'available',
    },
    {
      title: 'Servicios ofrecidos',
      description: 'Habilita los servicios que tu taller podra tomar mas adelante.',
      helper: 'Siguiente paso del modulo',
      status: 'upcoming',
    },
    {
      title: 'Tipos de vehiculo',
      description: 'Define los vehiculos compatibles para filtrar mejores solicitudes.',
      helper: 'Siguiente paso del modulo',
      status: 'upcoming',
    },
    {
      title: 'Incidentes disponibles',
      description: 'Revisa solicitudes pendientes y entra al detalle del caso.',
      helper: 'Ya disponible',
      route: '/taller/solicitudes',
      status: 'available',
    },
    {
      title: 'Tecnicos y unidades',
      description: 'Gestiona personal y recursos moviles cuando ese flujo quede habilitado.',
      helper: 'Siguiente paso del modulo',
      status: 'upcoming',
    },
    {
      title: 'Seguimiento e historial',
      description: 'Consulta avances y trazabilidad cuando el seguimiento quede integrado.',
      helper: 'Siguiente paso del modulo',
      status: 'upcoming',
    },
    {
      title: 'Comisiones',
      description: 'Revisa el resumen economico cuando el modulo administrativo quede activo.',
      helper: 'Siguiente paso del modulo',
      status: 'upcoming',
    },
  ];

  readonly recentActivity = computed(() => {
    const firstIncident = this.incidentes()[0];
    if (!firstIncident) {
      return 'Aun no hay actividad reciente. Cuando ingresen solicitudes nuevas apareceran aqui.';
    }

    return `${firstIncident.titulo || 'Incidente sin titulo'} - Estado ${firstIncident.id_estado_servicio_actual || 'N/D'} - Prioridad ${firstIncident.id_prioridad || 'N/D'}`;
  });

  readonly availabilityMessage = computed(() => {
    const availability = this.workshopAvailability();
    if (!availability) {
      return 'Consultando disponibilidad actual...';
    }

    return availability.disponible
      ? 'Disponible para recibir solicitudes'
      : 'No disponible temporalmente';
  });

  toggleSection(section: 'metrics' | 'quick' | 'activity'): void {
    if (section === 'metrics') {
      this.metricsOpen.update((value) => !value);
      return;
    }

    if (section === 'quick') {
      this.quickAccessOpen.update((value) => !value);
      return;
    }

    this.activityOpen.update((value) => !value);
  }

  ngOnInit(): void {
    this.loadAvailability();

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

  onAvailabilityChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const nextValue = target.checked;
    const currentAvailability = this.workshopAvailability();

    if (!currentAvailability || this.availabilitySaving()) {
      target.checked = currentAvailability?.disponible ?? false;
      return;
    }

    this.availabilitySaving.set(true);
    this.availabilityError.set('');

    this.workshopOperationalService
      .updateAvailability({ disponible: nextValue })
      .subscribe({
      next: (response) => {
        this.workshopAvailability.set(response);
        this.availabilitySaving.set(false);
      },
      error: (error) => {
        this.availabilitySaving.set(false);
        target.checked = currentAvailability.disponible;

        if (error?.status === 401) {
          this.tokenService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (error?.status === 403) {
          this.availabilityError.set(
            'No tienes permisos para cambiar la disponibilidad del taller.'
          );
          return;
        }

        this.availabilityError.set(
          'No se pudo guardar la disponibilidad. Intenta nuevamente.'
        );
      },
      });
  }

  private loadAvailability(): void {
    this.availabilityLoading.set(true);
    this.availabilityError.set('');

    this.workshopOperationalService.getAvailability().subscribe({
      next: (response) => {
        this.workshopAvailability.set(response);
        this.availabilityLoading.set(false);
      },
      error: (error) => {
        this.availabilityLoading.set(false);

        if (error?.status === 401) {
          this.tokenService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (error?.status === 403) {
          this.availabilityError.set(
            'No tienes permisos para consultar la disponibilidad del taller.'
          );
          return;
        }

        this.availabilityError.set(
          'No pudimos cargar la disponibilidad actual del taller.'
        );
      },
    });
  }
}
