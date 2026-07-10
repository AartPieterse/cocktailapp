import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PwaService } from '../pwa.service';

/**
 * Mobile install affordance for the PWA. Slides up from the bottom the first time a mobile
 * visitor lands on the site. Chromium shows a one-tap "Installeren" button; iOS Safari shows
 * the manual "Zet op beginscherm" steps (Apple exposes no install API). Dismissible + snoozed.
 */
@Component({
  selector: 'app-install-prompt',
  imports: [MatIconModule],
  template: `
    @if (pwa.showInstall() && open()) {
      <div class="scrim" (click)="dismiss()"></div>
      <section class="sheet" role="dialog" aria-labelledby="install-title" aria-modal="false">
        <button class="close" type="button" (click)="dismiss()" aria-label="Sluiten">
          <mat-icon>close</mat-icon>
        </button>

        <div class="head">
          <span class="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 4 h14 l-7 8 z" />
              <line x1="12" y1="12" x2="12" y2="20" />
              <line x1="8" y1="20" x2="16" y2="20" />
            </svg>
          </span>
          <div>
            <h2 id="install-title">Installeer Barkast</h2>
            <p class="sub">Zet Barkast op je beginscherm — snel te openen en werkt offline.</p>
          </div>
        </div>

        @if (pwa.canInstall()) {
          <div class="actions">
            <button class="btn btn-primary" type="button" (click)="install()">
              <mat-icon>get_app</mat-icon> Installeren
            </button>
            <button class="btn btn-ghost" type="button" (click)="dismiss()">Niet nu</button>
          </div>
        } @else {
          <ol class="steps">
            <li>
              Tik op <strong>Delen</strong>
              <span class="ios-glyph" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 15V3" /><path d="m8 7 4-4 4 4" />
                  <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
                </svg>
              </span>
              onderin je scherm.
            </li>
            <li>Kies <strong>Zet op beginscherm</strong>.</li>
            <li>Tik op <strong>Voeg toe</strong> — klaar!</li>
          </ol>
          <button class="btn btn-ghost full" type="button" (click)="dismiss()">Begrepen</button>
        }
      </section>
    }
  `,
  styles: `
    .scrim {
      position: fixed;
      inset: 0;
      background: rgba(20, 14, 8, 0.42);
      backdrop-filter: blur(2px);
      z-index: 60;
      animation: scrim-in 0.2s ease both;
    }
    @keyframes scrim-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 61;
      background: var(--surface);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      border-top: 1px solid var(--hairline);
      box-shadow: var(--shadow-lg);
      padding: 24px 20px calc(20px + env(safe-area-inset-bottom));
      animation: sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes sheet-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .close {
      position: absolute;
      top: 14px;
      right: 12px;
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border: none;
      border-radius: 999px;
      background: none;
      color: var(--muted);
      cursor: pointer;
    }
    .close mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-right: 36px;
    }
    .app-icon {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      flex: none;
      border-radius: 14px;
      background: var(--night);
      color: var(--accent);
    }
    .head h2 {
      font-family: var(--font-display);
      font-size: 1.4rem;
      margin: 0;
    }
    .sub {
      color: var(--muted);
      margin: 3px 0 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: var(--radius-pill);
      padding: 14px 22px;
      font: 600 0.938rem var(--font-body);
      cursor: pointer;
      border: 1.5px solid transparent;
      min-height: 48px;
    }
    .btn-primary {
      flex: 1;
      background: var(--accent);
      color: #fff;
    }
    .btn-primary mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .btn-ghost {
      background: none;
      border-color: var(--hairline);
      color: var(--muted);
    }
    .btn-ghost.full {
      width: 100%;
      margin-top: 16px;
    }
    .steps {
      margin: 18px 0 0;
      padding-left: 22px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: var(--ink);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .steps li::marker {
      color: var(--accent);
      font-weight: 700;
    }
    .ios-glyph {
      display: inline-flex;
      vertical-align: -3px;
      margin: 0 2px;
      color: var(--accent);
    }
  `,
})
export class InstallPrompt {
  protected readonly pwa = inject(PwaService);
  protected readonly open = signal(true);

  async install(): Promise<void> {
    const accepted = await this.pwa.install();
    if (!accepted) this.close();
  }

  dismiss(): void {
    this.pwa.dismiss();
    this.close();
  }

  private close(): void {
    this.open.set(false);
  }
}
