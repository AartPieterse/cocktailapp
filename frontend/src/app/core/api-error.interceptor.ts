import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { UiStrings } from '@cocktailapp/shared';
import { catchError, throwError } from 'rxjs';
import { LanguageService } from './language.service';

/** Human-readable, localized fallback per status code. */
function messageFor(err: HttpErrorResponse, errors: UiStrings['errors']): string {
  const fromServer = typeof err.error?.message === 'string' ? err.error.message : null;
  switch (err.status) {
    case 0:
      return errors.network;
    case 400:
      return fromServer ?? errors.invalid;
    case 404:
      return fromServer ?? errors.notFound;
    case 409:
      return fromServer ?? errors.exists;
    case 429:
      return errors.rateLimit;
    default:
      return fromServer ?? errors.generic;
  }
}

/**
 * Surfaces every failed HTTP call as a snackbar so nothing fails silently,
 * then re-throws so components can still react if they want to.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const lang = inject(LanguageService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const strings = lang.t();
      snackBar.open(messageFor(err, strings.errors), strings.errors.dismiss, {
        duration: 5000,
        panelClass: 'snack-error',
      });
      return throwError(() => err);
    }),
  );
};
