import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';


export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.getCurrentUserSnapshot();
  const expectedRoles = route.data['roles'] as string[] | undefined;

  if(!currentUser){
    return router.createUrlTree(['/login']);
  }

  if(!expectedRoles || expectedRoles.length === 0){
    return true;
  }

  const hasRole = currentUser.roles.some(role => expectedRoles.includes(role));

  if (hasRole){
    return true;
  }
  
  return router.createUrlTree(['/login']);
};
