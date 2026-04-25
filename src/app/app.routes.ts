import { Routes } from '@angular/router';

import { AdminLayout } from './core/layouts/admin-layout/admin-layout';
import { authGuard } from './core/guards/auth.guard';
import { Login } from './features/autenticacion-seguridad/pages/login/login';
import { RegisterWorkshop } from './features/autenticacion-seguridad/pages/register-workshop/register-workshop';
import { BitacoraSistema } from './features/administracion/pages/bitacora-sistema/bitacora-sistema';
import { GestionarRoles } from './features/administracion/pages/gestionar-roles/gestionar-roles';
import { InicioAdmin } from './features/administracion/pages/inicio-admin/inicio-admin';
import { DetalleSolicitud } from './features/gestion-incidentes-atencion/pages/detalle-solicitud/detalle-solicitud';
import { SolicitudesDisponibles } from './features/gestion-incidentes-atencion/pages/solicitudes-disponibles/solicitudes-disponibles';
import { DisponibilidadTaller } from './features/gestion-operativa-taller-tecnico/pages/disponibilidad-taller/disponibilidad-taller';
import { InicioTaller } from './features/gestion-operativa-taller-tecnico/pages/inicio-taller/inicio-taller';
import { Home } from './features/publico/pages/home/home';
import { TallerLayout } from './core/layouts/taller-layout/taller-layout';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'registro/taller',
    component: RegisterWorkshop,
  },
  {
    path: 'taller',
    component: TallerLayout,
    canActivate: [authGuard],
    data: {
      allowedRoles: ['taller'],
    },
    children: [
      {
        path: '',
        component: InicioTaller,
      },
      {
        path: 'disponibilidad',
        component: DisponibilidadTaller,
      },
      {
        path: 'solicitudes',
        component: SolicitudesDisponibles,
      },
      {
        path: 'solicitudes/:id',
        component: DetalleSolicitud,
      },
    ],
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    data: {
      allowedRoles: ['admin', 'administrador'],
    },
    children: [
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
      {
        path: 'inicio',
        component: InicioAdmin,
      },
      {
        path: 'roles',
        component: GestionarRoles,
      },
      {
        path: 'bitacora',
        component: BitacoraSistema,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
