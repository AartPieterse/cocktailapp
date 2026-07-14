import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../toast.service';

/**
 * Renders the current {@link ToastService} toast, if any. Fixed at the bottom-centre, above the
 * mobile bottom nav. Tap to dismiss. See ToastService for when toasts are raised.
 */
@Component({
  selector: 'app-toast',
  imports: [MatIconModule],
  template: `
    @if (toast.current(); as t) {
      <div class="wrap">
        <button class="toast" type="button" (click)="toast.dismiss()" aria-live="polite">
          @if (t.tone === 'unlock') {
            <span class="badge"><mat-icon>check</mat-icon></span>
          }
          <span class="body">
            <span class="title">{{ t.title }}</span>
            @if (t.sub) {
              <span class="sub">{{ t.sub }}</span>
            }
          </span>
        </button>
      </div>
    }
  `,
  styles: `
    .wrap {
      position: fixed;
      left: 50%;
      bottom: 34px;
      z-index: 60;
      transform: translateX(-50%);
      animation: toastin 0.34s ease both;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: min(420px, calc(100vw - 32px));
      background: var(--night);
      color: var(--night-ink);
      border: none;
      border-radius: 18px;
      padding: 16px 22px;
      box-shadow: 0 24px 48px -20px rgba(36, 30, 23, 0.6);
      cursor: pointer;
      pointer-events: auto;
      text-align: left;
      font-family: var(--font-body);
    }
    .badge {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      flex: none;
      border-radius: 50%;
      background: var(--ok);
      color: #fff;
      animation: pop 0.4s ease both;
    }
    .badge mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .body {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.125rem;
      line-height: 1.1;
    }
    .sub {
      font: 500 0.813rem var(--font-body);
      color: var(--night-faint);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 780px) {
      .wrap {
        bottom: calc(78px + env(safe-area-inset-bottom));
      }
    }
  `,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
