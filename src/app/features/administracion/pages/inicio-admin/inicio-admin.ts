import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio-admin.html',
  styleUrl: './inicio-admin.scss',
})
export class InicioAdmin {
  readonly cards = [
    {
      title: 'Autenticacion y Seguridad',
      description: 'Supervisa roles, accesos y bitacora del sistema.',
    },
    {
      title: 'Gestion de Clientes',
      description: 'Consulta clientes, vehiculos, pagos y calificaciones registradas.',
    },
    {
      title: 'Gestion Operativa de Taller y Tecnico',
      description: 'Monitorea talleres, tecnicos, servicios y unidades moviles.',
    },
    {
      title: 'Gestion de Incidentes y Atencion',
      description: 'Audita incidentes, solicitudes, asignaciones y estados del servicio.',
    },
    {
      title: 'Seguimiento y Monitoreo del Servicio',
      description: 'Consulta estados, notificaciones, historiales y trazabilidad operativa.',
    },
    {
      title: 'Inteligencia y Gestion Estrategica',
      description: 'Revisa analisis IA, metricas y comisiones de plataforma.',
    },
  ];
}
