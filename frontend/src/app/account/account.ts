import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../core/auth/auth.service';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

type Mode = 'login' | 'register';

/**
 * Optional account screen: sign in / register to sync your cabinet + favorites across devices,
 * or manage the current session. Server errors already surface via the apiErrorInterceptor.
 */
@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="page">
      @if (auth.isAuthenticated()) {
        <div class="card">
          <mat-icon class="hero">account_circle</mat-icon>
          <h1>Ingelogd</h1>
          <p class="muted">Je kast en favorieten synchroniseren over je apparaten.</p>
          <p class="email">{{ auth.user()?.email }}</p>
          <div class="actions">
            <button mat-stroked-button (click)="logout()">Uitloggen</button>
            <button mat-button class="danger" (click)="remove()">Account verwijderen</button>
          </div>
        </div>
      } @else {
        <div class="card">
          <h1>{{ mode() === 'login' ? 'Inloggen' : 'Account aanmaken' }}</h1>
          <p class="muted">
            Sla je kast en favorieten op en synchroniseer ze over je apparaten. Optioneel — de app
            werkt ook zonder account.
          </p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>E-mailadres</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.controls.email.hasError('email') && form.controls.email.touched) {
                <mat-error>Voer een geldig e-mailadres in.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Wachtwoord</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
              />
              @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
                <mat-error>Minstens 8 tekens.</mat-error>
              }
            </mat-form-field>
            <button
              mat-flat-button
              type="submit"
              class="submit"
              [disabled]="form.invalid || busy()"
            >
              {{ mode() === 'login' ? 'Inloggen' : 'Account aanmaken' }}
            </button>
          </form>
          <button class="switch" type="button" (click)="toggleMode()">
            {{
              mode() === 'login'
                ? 'Nog geen account? Maak er een aan'
                : 'Al een account? Log in'
            }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 440px;
      margin: 0 auto;
      padding-top: 64px;
      animation: rise 0.45s ease both;
    }
    .card {
      border: 1px solid var(--hairline);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 36px 32px;
      text-align: center;
    }
    .hero {
      font-size: 52px;
      width: 52px;
      height: 52px;
      color: var(--accent);
      margin-bottom: 8px;
    }
    h1 {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }
    .muted {
      color: var(--muted);
      font-size: 0.938rem;
      margin: 0 0 24px;
    }
    .email {
      font-weight: 600;
      margin: 0 0 24px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }
    mat-form-field {
      width: 100%;
    }
    .submit {
      margin-top: 8px;
      height: 46px;
    }
    .switch {
      margin-top: 18px;
      border: none;
      background: none;
      color: var(--accent);
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
    }
    .switch:hover {
      text-decoration: underline;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: stretch;
    }
    .danger {
      color: var(--warn);
    }
  `,
})
export class Account {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly mode = signal<Mode>('login');
  protected readonly busy = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  toggleMode(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
  }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    const call =
      this.mode() === 'login'
        ? this.auth.login(email, password)
        : this.auth.register(email, password);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open('Je bent ingelogd — synchroniseren gestart.', 'OK', { duration: 3000 });
      },
      error: () => this.busy.set(false), // apiErrorInterceptor already showed the message
    });
  }

  logout(): void {
    this.auth.logout();
    this.snackBar.open('Uitgelogd. Je kast blijft op dit apparaat bewaard.', 'OK', {
      duration: 3000,
    });
  }

  remove(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Account verwijderen',
        message:
          'Weet je zeker dat je je account en alle gesynchroniseerde gegevens definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
        confirmLabel: 'Verwijderen',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.auth.deleteAccount().subscribe({
        next: () =>
          this.snackBar.open('Account verwijderd.', 'OK', { duration: 3000 }),
        error: () => undefined,
      });
    });
  }
}
