import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TokenService } from '../../services/token.service';

interface NavGroup {
  title: string;
  items: Array<{ label: string; route: string }>;
}

@Component({
  selector: 'app-taller-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './taller-layout.html',
  styleUrl: './taller-layout.scss',
})
export class TallerLayout {
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly navGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [{ label: 'Inicio del taller', route: '/taller' }],
    },
    {
      title: 'Operacion del taller',
      items: [
        { label: 'Disponibilidad del taller', route: '/taller' },
        { label: 'Servicios ofrecidos', route: '/taller' },
        { label: 'Tipos de vehiculo', route: '/taller' },
      ],
    },
    {
      title: 'Tecnicos y unidades',
      items: [
        { label: 'Disponibilidad del tecnico', route: '/taller' },
        { label: 'Especialidades', route: '/taller' },
        { label: 'Unidades moviles', route: '/taller' },
        { label: 'Gestion de tecnicos', route: '/taller' },
      ],
    },
    {
      title: 'Incidentes y atencion',
      items: [
        { label: 'Incidentes disponibles', route: '/taller/solicitudes' },
        { label: 'Respuesta a solicitudes', route: '/taller/solicitudes' },
        { label: 'Asignacion de recursos', route: '/taller/solicitudes' },
        { label: 'Estado del servicio', route: '/taller/solicitudes' },
      ],
    },
    {
      title: 'Seguimiento',
      items: [
        { label: 'Notificaciones', route: '/taller' },
        { label: 'Historial del incidente', route: '/taller' },
      ],
    },
  ];

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
