import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CocktailService } from '../../services/cocktail.service';
import { ThemeService } from '../theme.service';
import { PwaService } from '../pwa.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  template: `
    <header class="bar">
      <div class="container inner">
        <a class="brand" routerLink="/bar" aria-label="Barkast home">
          <span class="glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 4 h14 l-7 8 z" />
              <line x1="12" y1="12" x2="12" y2="20" />
              <line x1="8" y1="20" x2="16" y2="20" />
            </svg>
          </span>
          <span class="mark">Barkast</span>
        </a>

        <nav class="links" [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          <a routerLink="/bar" routerLinkActive="active">Mijn bar</a>
          <a routerLink="/cocktails" routerLinkActive="active">Cocktails</a>
          <a routerLink="/kast" routerLinkActive="active">Mijn kast</a>
        </nav>

        <div class="actions">
          @if (pwa.canInstall()) {
            <button
              class="icon-btn install"
              type="button"
              (click)="pwa.install()"
              matTooltip="Installeer Barkast"
              aria-label="Installeer Barkast"
            >
              <mat-icon>get_app</mat-icon>
            </button>
          }
          <button class="surprise" type="button" (click)="surprise()">
            <mat-icon>casino</mat-icon> Verras me
          </button>
          @if (authEnabled) {
            <a
              class="icon-btn"
              routerLink="/account"
              routerLinkActive="active"
              [matTooltip]="auth.isAuthenticated() ? 'Account' : 'Inloggen'"
              [attr.aria-label]="auth.isAuthenticated() ? 'Account' : 'Inloggen'"
            >
              <mat-icon>{{ auth.isAuthenticated() ? 'account_circle' : 'login' }}</mat-icon>
            </a>
          }
          <button
            class="icon-btn"
            type="button"
            (click)="theme.toggle()"
            [matTooltip]="theme.theme() === 'dark' ? 'Lichte modus' : 'Donkere modus'"
            aria-label="Wissel thema"
          >
            <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <button
            class="icon-btn burger"
            type="button"
            (click)="menuOpen.update((v) => !v)"
            aria-label="Menu"
          >
            <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 40;
      background: color-mix(in srgb, var(--bg) 86%, transparent);
      backdrop-filter: saturate(1.2) blur(12px);
      border-bottom: 1px solid var(--hairline);
      /* Extend the bar under the status bar when installed on a notched phone. */
      padding-top: env(safe-area-inset-top);
    }
    .inner {
      display: flex;
      align-items: center;
      gap: var(--sp-5);
      height: 74px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .brand .glyph {
      display: inline-flex;
      color: var(--accent);
    }
    .mark {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.44rem;
      letter-spacing: -0.01em;
    }
    .links {
      display: flex;
      gap: 30px;
      margin-left: var(--sp-4);
    }
    .links a {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--muted);
      padding: 6px 0;
      border-bottom: 2px solid transparent;
      transition: color 0.15s ease;
    }
    .links a:hover {
      color: var(--ink);
    }
    .links a.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    .actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }
    .surprise {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--ink);
      color: var(--bg);
      border: none;
      border-radius: var(--radius-pill);
      padding: 10px 18px;
      font: 600 0.844rem var(--font-body);
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .surprise:hover {
      transform: translateY(-1px);
      opacity: 0.92;
    }
    .surprise mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .icon-btn {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      background: none;
      color: var(--muted);
      cursor: pointer;
    }
    .icon-btn:hover {
      background: var(--surface-2);
      color: var(--ink);
    }
    .icon-btn.install {
      color: var(--accent);
    }
    .icon-btn.install:hover {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .burger {
      display: none;
    }
    @media (max-width: 780px) {
      .inner {
        gap: var(--sp-3);
      }
      .surprise span,
      .surprise {
        font-size: 0;
      }
      .surprise {
        padding: 10px 12px;
        gap: 0;
      }
      .surprise mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .links {
        position: absolute;
        top: calc(74px + env(safe-area-inset-top));
        left: 0;
        right: 0;
        flex-direction: column;
        gap: 0;
        margin: 0;
        background: var(--surface);
        border-bottom: 1px solid var(--hairline);
        padding: var(--sp-2) var(--sp-5);
        display: none;
      }
      .links.open {
        display: flex;
      }
      .links a {
        padding: var(--sp-3) 0;
        border-bottom: 1px solid var(--hairline);
      }
      .links a.active {
        border-bottom-color: var(--hairline);
      }
      .burger {
        display: grid;
      }
    }
  `,
})
export class Navbar {
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  protected readonly auth = inject(AuthService);
  protected readonly authEnabled = environment.authEnabled;
  private readonly cocktails = inject(CocktailService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  surprise(): void {
    this.cocktails.getRandom().subscribe({
      next: (c) => void this.router.navigate(['/cocktails', c.id]),
      error: () => undefined,
    });
  }
}
