import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import {registerLocaleData} from '@angular/common'

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { AuthService } from './core/services/auth.service';
import localeFr from '@angular/common/locales/fr'

  registerLocaleData(localeFr);


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initializeApp();
    }),
    {provide: LOCALE_ID, useValue:'fr-FR'}
  ]
};
