import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly roleCards = [
    {
      title: 'Cliente',
      description:
        'Reporta incidentes, adjunta evidencia y consulta el estado de tu auxilio.',
      icon: 'C',
    },
    {
      title: 'Taller',
      description:
        'Visualiza solicitudes, acepta atenciones y asigna tecnicos o unidades moviles.',
      icon: 'T',
    },
    {
      title: 'Tecnico',
      description:
        'Consulta incidentes asignados, actualiza ubicacion y registra el avance del servicio.',
      icon: 'Tec',
    },
    {
      title: 'Administrador',
      description:
        'Supervisa roles, metricas, comisiones y trazabilidad del sistema.',
      icon: 'A',
    },
  ];

  readonly services = [
    'Reporte de incidentes con evidencia multimodal',
    'Asignacion de talleres y tecnicos segun prioridad',
    'Seguimiento del servicio y notificaciones en tiempo real',
    'Resumen inteligente del incidente para agilizar la atencion',
  ];

  readonly steps = [
    'El cliente reporta el incidente y comparte ubicacion.',
    'La plataforma analiza el caso y prioriza la atencion.',
    'Se asigna el taller mas adecuado con tecnico disponible.',
    'El servicio se monitorea hasta el cierre, pago y calificacion.',
  ];
}
