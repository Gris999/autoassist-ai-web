import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = route.data?.['allowedRoles'] as string[] | undefined;
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = tokenService.getUserRole();
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  const dashboardRoute = tokenService.getDashboardRoute(userRole);
  return router.createUrlTree([dashboardRoute ?? '/login']);
};
