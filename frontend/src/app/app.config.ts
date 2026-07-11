import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { apiErrorInterceptor } from './core/api-error.interceptor';
import { AppTitleStrategy } from './core/title-strategy';
import { authInterceptor } from './core/auth/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // authInterceptor is innermost: it sees a 401 and refreshes+retries before apiErrorInterceptor
    // would surface an error snackbar.
    provideHttpClient(withInterceptors([apiErrorInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
