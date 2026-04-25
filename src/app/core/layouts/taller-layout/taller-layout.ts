import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../features/autenticacion-seguridad/services/auth.service';
import { TokenService } from '../../services/token.service';

interface NavGroup {
  title: string;
  shortLabel: string;
  items: Array<{
    label: string;
    route?: string;
    action?: 'logout';
    disabled?: boolean;
    note?: string;
  }>;
}

@Component({
  selector: 'app-taller-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './taller-layout.html',
  styleUrl: './taller-layout.scss',
})
export class TallerLayout {
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  readonly activeGroup = signal('Gestion Operativa de Taller y Tecnico');
  readonly sidebarCollapsed = signal(false);

  readonly workshopProfile = computed(() => {
    const user = this.tokenService.getCurrentUser();
    if (!user) {
      return {
        initials: 'T',
        name: 'Panel del taller',
        subtitle: 'Cuenta habilitada',
      };
    }

    const initials = `${user.nombres?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`
      .trim()
      .toUpperCase();

    return {
      initials: initials || 'T',
      name: `${user.nombres} ${user.apellidos}`.trim(),
      subtitle: user.email,
    };
  });

  readonly navGroups: NavGroup[] = [
    {
      title: 'Gestion Operativa de Taller y Tecnico',
      shortLabel: 'OT',
      items: [
        { label: 'Inicio del taller', route: '/taller' },
        { label: 'Disponibilidad del taller', route: '/taller/disponibilidad' },
        { label: 'Servicios ofrecidos', disabled: true, note: 'Proximamente' },
        { label: 'Tipos de vehiculo', disabled: true, note: 'Proximamente' },
        { label: 'Tecnicos', disabled: true, note: 'Proximamente' },
        { label: 'Disponibilidad del tecnico', disabled: true, note: 'Proximamente' },
        { label: 'Especialidades', disabled: true, note: 'Proximamente' },
        { label: 'Unidades moviles', disabled: true, note: 'Proximamente' },
      ],
    },
    {
      title: 'Gestion de Incidentes y Atencion',
      shortLabel: 'IA',
      items: [
        { label: 'Incidentes disponibles', route: '/taller/solicitudes' },
        { label: 'Responder solicitud', disabled: true, note: 'Siguiente paso' },
        { label: 'Asignar recursos', disabled: true, note: 'Siguiente paso' },
        { label: 'Estado del servicio', disabled: true, note: 'Siguiente paso' },
      ],
    },
    {
      title: 'Seguimiento y Monitoreo del Servicio',
      shortLabel: 'SM',
      items: [
        { label: 'Notificaciones', disabled: true, note: 'Proximamente' },
        { label: 'Historial', disabled: true, note: 'Proximamente' },
      ],
    },
    {
      title: 'Inteligencia y Gestion Estrategica',
      shortLabel: 'IE',
      items: [{ label: 'Comisiones', disabled: true, note: 'Proximamente' }],
    },
    {
      title: 'Autenticacion y Seguridad',
      shortLabel: 'AS',
      items: [
        { label: 'Perfil del taller', disabled: true, note: 'Proximamente' },
        { label: 'Cerrar sesion', action: 'logout' },
      ],
    },
  ];

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  toggleGroup(groupTitle: string): void {
    this.activeGroup.update((current) =>
      current === groupTitle ? '' : groupTitle
    );
  }

  handleAction(action?: 'logout'): void {
    if (action === 'logout') {
      this.authService
        .logout()
        .pipe(
          finalize(() => {
            this.tokenService.clearSession();
            this.router.navigate(['/login']);
          })
        )
        .subscribe({
          error: () => {
            // Local cleanup still happens in finalize.
          },
        });
    }
  }
}
