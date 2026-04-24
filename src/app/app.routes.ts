import { Routes } from '@angular/router';
import { Login } from './features/autenticacion-seguridad/pages/login/login';
import { RegisterWorkshop } from './features/autenticacion-seguridad/pages/register-workshop/register-workshop';
import { Home } from './features/publico/pages/home/home';
import { TallerLayout } from './core/layouts/taller-layout/taller-layout';
import { DetalleSolicitud } from './features/gestion-incidentes-atencion/pages/detalle-solicitud/detalle-solicitud';
import { SolicitudesDisponibles } from './features/gestion-incidentes-atencion/pages/solicitudes-disponibles/solicitudes-disponibles';
import { InicioTaller } from './features/gestion-operativa-taller-tecnico/pages/inicio-taller/inicio-taller';

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
    children: [
      {
        path: '',
        component: InicioTaller,
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
    path: '**',
    redirectTo: '',
  },
];
