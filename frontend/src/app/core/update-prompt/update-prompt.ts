import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SwUpdateService } from '../sw-update.service';

/**
 * Persistent bar shown when a newer version of the app has been deployed and is waiting to activate
 * (see {@link SwUpdateService}). Tapping "Vernieuwen" swaps in the new version and reloads — the
 * user's saved data (cabinet, favourites, theme) is preserved. Unlike the reward Toast, this stays
 * put until acted on. Pinned bottom-centre, clearing the mobile bottom nav.
 */
@Component({
  selector: 'app-update-prompt',
  imports: [MatIconModule],
  template: `
    @if (sw.available()) {
      <div class="wrap" role="status" aria-live="polite">
        <div class="bar">
          <span class="icon" aria-hidden="true"><mat-icon>update</mat-icon></span>
          <span class="body">
            <span class="title">Nieuwe versie beschikbaar</span>
            <span class="sub">Vernieuw om de laatste Barkast te laden.</span>
          </span>
          <button
            class="refresh"
            type="button"
            (click)="sw.applyUpdate()"
            [disabled]="sw.activating()"
          >
            {{ sw.activating() ? 'Bezig…' : 'Vernieuwen' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .wrap {
      position: fixed;
      left: 50%;
      bottom: 34px;
      z-index: 55;
      transform: translateX(-50%);
      animation: prompt-in 0.34s ease both;
      pointer-events: none;
    }
    @keyframes prompt-in {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: min(460px, calc(100vw - 32px));
      background: var(--night);
      color: var(--night-ink);
      border-radius: 18px;
      padding: 14px 16px 14px 20px;
      box-shadow: 0 24px 48px -20px rgba(36, 30, 23, 0.6);
      pointer-events: auto;
      font-family: var(--font-body);
    }
    .icon {
      display: grid;
      place-items: center;
      flex: none;
      color: var(--accent);
    }
    .icon mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .body {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.0625rem;
      line-height: 1.15;
    }
    .sub {
      font: 500 0.813rem var(--font-body);
      color: var(--night-faint);
      margin-top: 2px;
    }
    .refresh {
      flex: none;
      border: none;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: #fff;
      padding: 12px 18px;
      min-height: 44px;
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
    }
    .refresh:disabled {
      opacity: 0.7;
      cursor: default;
    }
    @media (max-width: 780px) {
      .wrap {
        bottom: calc(78px + env(safe-area-inset-bottom));
      }
    }
  `,
})
export class UpdatePrompt {
  protected readonly sw = inject(SwUpdateService);
}
