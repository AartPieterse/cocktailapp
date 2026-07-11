import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Login/register/refresh must never carry a stale bearer or trigger a refresh-on-401 loop. */
const AUTH_ENDPOINT = /\/auth\/(login|register|refresh)$/;

/**
 * Attaches the bearer access token to backend calls and transparently refreshes it on a 401.
 * Registered as the INNERMOST interceptor (after apiErrorInterceptor), so a successful
 * refresh + retry means the error snackbar never fires — only a truly unrecoverable 401 bubbles
 * up. Inert when `authEnabled` is false or the request is not aimed at the backend.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.authEnabled) return next(req);

  const base = environment.apiBaseUrl;
  const isBackend = req.url.startsWith(base) || req.url.startsWith('/api/');
  if (!isBackend) return next(req);

  const auth = inject(AuthService);
  const isAuthEndpoint = AUTH_ENDPOINT.test(req.url);
  const token = auth.accessToken();

  const outgoing =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthEndpoint || !auth.accessToken()) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap((fresh) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } })),
        ),
        catchError((refreshErr) => {
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
