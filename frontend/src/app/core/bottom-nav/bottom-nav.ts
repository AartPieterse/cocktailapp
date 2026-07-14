import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CocktailService } from '../../services/cocktail.service';
import { AnalyticsService } from '../analytics.service';

/**
 * Fixed bottom tab bar for narrow screens (native-app feel for the installed PWA). Hidden on
 * desktop, where the top navbar carries the same links. Kept in sync with the navbar's link set:
 * Mijn bar / Cocktails / Verras me / Mijn kast.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="bar" aria-label="Hoofdnavigatie">
      <a routerLink="/bar" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>local_bar</mat-icon>
        <span>Mijn bar</span>
      </a>
      <a routerLink="/cocktails" routerLinkActive="active">
        <mat-icon>format_list_bulleted</mat-icon>
        <span>Cocktails</span>
      </a>
      <button type="button" (click)="surprise()">
        <mat-icon>casino</mat-icon>
        <span>Verras me</span>
      </button>
      <a routerLink="/kast" routerLinkActive="active">
        <mat-icon>kitchen</mat-icon>
        <span>Mijn kast</span>
      </a>
    </nav>
  `,
  styles: `
    .bar {
      display: none;
    }
    @media (max-width: 780px) {
      .bar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 45;
        display: flex;
        padding: 6px 12px calc(8px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--hairline);
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        backdrop-filter: saturate(1.2) blur(10px);
      }
    }
    a,
    button {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 0;
      font: 600 0.625rem var(--font-body);
      color: var(--faint);
      transition: transform 0.12s ease, color 0.15s ease;
    }
    a:active,
    button:active {
      transform: scale(0.88);
    }
    a.active {
      color: var(--accent);
    }
    mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
  `,
})
export class BottomNav {
  private readonly cocktails = inject(CocktailService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  surprise(): void {
    this.analytics.track('surprise_me');
    this.cocktails.getRandom().subscribe({
      next: (c) => void this.router.navigate(['/cocktails', c.id]),
      error: () => undefined,
    });
  }
}
