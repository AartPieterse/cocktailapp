import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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
import { SwUpdateService } from './core/sw-update.service';
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
    provideHttpClient(withInterceptors([apiErrorInterceptor, authInterceptor]), withFetch()),
    provideAnimationsAsync(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // Start watching for a freshly-deployed version so we can prompt the user to refresh.
    provideAppInitializer(() => inject(SwUpdateService).init()),
  ],
};
