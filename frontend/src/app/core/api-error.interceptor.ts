import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

/** Human-readable Dutch fallback per status code. */
function messageFor(err: HttpErrorResponse): string {
  const fromServer = typeof err.error?.message === 'string' ? err.error.message : null;
  switch (err.status) {
    case 0:
      return 'Geen verbinding met de server. Draait de backend?';
    case 400:
      return fromServer ?? 'Ongeldige invoer.';
    case 404:
      return fromServer ?? 'Niet gevonden.';
    case 409:
      return fromServer ?? 'Bestaat al.';
    case 429:
      return 'Even rustig aan — te veel verzoeken.';
    default:
      return fromServer ?? 'Er ging iets mis. Probeer het opnieuw.';
  }
}

/**
 * Surfaces every failed HTTP call as a snackbar so nothing fails silently,
 * then re-throws so components can still react if they want to.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      snackBar.open(messageFor(err), 'Sluiten', {
        duration: 5000,
        panelClass: 'snack-error',
      });
      return throwError(() => err);
    }),
  );
};
