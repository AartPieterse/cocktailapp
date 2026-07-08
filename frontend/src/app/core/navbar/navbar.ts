import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CabinetService } from '../cabinet.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <header class="bar">
      <div class="container inner">
        <a class="brand" routerLink="/bar" aria-label="Barkast home">
          <span class="mark">Bar<span class="mark-accent">kast</span></span>
        </a>

        <nav class="links" [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          <a routerLink="/bar" routerLinkActive="active">Mijn bar</a>
          <a routerLink="/cocktails" routerLinkActive="active">Cocktails</a>
          <a routerLink="/ingredienten" routerLinkActive="active">Ingrediënten</a>
        </nav>

        <div class="actions">
          <a
            class="cabinet-chip"
            routerLink="/bar"
            matTooltip="Ingrediënten in je bar"
            aria-label="Ingrediënten in je bar"
          >
            <mat-icon>local_bar</mat-icon>
            <span>{{ cabinet.count() }}</span>
          </a>
          <button
            mat-icon-button
            type="button"
            (click)="theme.toggle()"
            [matTooltip]="theme.theme() === 'dark' ? 'Lichte modus' : 'Donkere modus'"
            aria-label="Wissel thema"
          >
            <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <button
            class="burger"
            mat-icon-button
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
      z-index: 20;
      background: color-mix(in srgb, var(--bg) 88%, transparent);
      backdrop-filter: saturate(1.2) blur(10px);
      border-bottom: 1px solid var(--hairline);
    }
    .inner {
      display: flex;
      align-items: center;
      gap: var(--sp-5);
      height: 64px;
    }
    .brand {
      display: inline-flex;
      align-items: baseline;
    }
    .mark {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.5rem;
      letter-spacing: -0.02em;
    }
    .mark-accent {
      color: var(--accent);
    }
    .links {
      display: flex;
      gap: var(--sp-5);
      margin-left: var(--sp-4);
    }
    .links a {
      font-weight: 500;
      color: var(--muted);
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition: color 0.15s ease;
    }
    .links a:hover {
      color: var(--ink);
    }
    .links a.active {
      color: var(--ink);
      border-bottom-color: var(--accent);
    }
    .actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--sp-1);
    }
    .cabinet-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      font-weight: 600;
      font-size: var(--step--1);
      color: var(--ink);
    }
    .cabinet-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent);
    }
    .cabinet-chip:hover {
      border-color: var(--accent);
    }
    .burger {
      display: none;
    }
    @media (max-width: 720px) {
      .links {
        position: absolute;
        top: 64px;
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
        display: inline-flex;
      }
    }
  `,
})
export class Navbar {
  protected readonly theme = inject(ThemeService);
  protected readonly cabinet = inject(CabinetService);
  protected readonly menuOpen = signal(false);
}
