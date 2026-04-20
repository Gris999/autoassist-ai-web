import { Routes } from '@angular/router';
import { Login } from './features/autenticacion-seguridad/pages/login/login';
import { SolicitudesDisponibles } from './features/gestion-incidentes-atencion/pages/solicitudes-disponibles/solicitudes-disponibles';
import { DetalleSolicitud } from './features/gestion-incidentes-atencion/pages/detalle-solicitud/detalle-solicitud';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'solicitudes',
    component: SolicitudesDisponibles,
  },
  {
    path: 'solicitudes/:id',
    component: DetalleSolicitud,
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];