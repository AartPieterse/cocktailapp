import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../language.service';

/**
 * Fixed bottom tab bar for narrow screens (native-app feel for the installed PWA). Hidden on
 * desktop, where the top navbar carries the same links, and kept in sync with it:
 * Ontdek / Cocktails / Techniek / Mijn bar.
 *
 * It used to carry both "Mijn bar" (`/bar`) and "Mijn kast" (`/kast`, which merely redirects to
 * `/bar`) — two tabs to one destination, with the "kast" wording left over from the rename — and
 * no tab at all for the home screen. All four labels were hardcoded Dutch outside the string table.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="bar" [attr.aria-label]="lang.t().nav.menu">
      <a routerLink="/ontdek" routerLinkActive="active">
        <mat-icon>explore</mat-icon>
        <span>{{ lang.t().nav.discover }}</span>
      </a>
      <a routerLink="/cocktails" routerLinkActive="active">
        <mat-icon>format_list_bulleted</mat-icon>
        <span>{{ lang.t().nav.cocktails }}</span>
      </a>
      <a routerLink="/techniek" routerLinkActive="active">
        <mat-icon>school</mat-icon>
        <span>{{ lang.t().nav.technique }}</span>
      </a>
      <a routerLink="/bar" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>local_bar</mat-icon>
        <span>{{ lang.t().nav.myBar }}</span>
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
  protected readonly lang = inject(LanguageService);
}
