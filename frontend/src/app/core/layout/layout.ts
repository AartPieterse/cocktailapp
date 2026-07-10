import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { InstallPrompt } from '../install-prompt/install-prompt';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, Navbar, InstallPrompt],
  template: `
    <app-navbar />
    <main>
      <div class="container page">
        <router-outlet />
      </div>
    </main>
    <footer class="no-print">
      <div class="container foot">
        <span>Barkast — <span class="muted">wat kan jij maken?</span></span>
        <span class="muted">
          <a routerLink="/cocktails">Cocktails</a> ·
          <a routerLink="/kast">Mijn kast</a>
        </span>
      </div>
    </footer>
    <app-install-prompt />
  `,
  styles: `
    main {
      display: block;
      min-height: 70vh;
    }
    .page {
      padding-bottom: var(--sp-8);
    }
    footer {
      border-top: 1px solid var(--hairline);
      padding: var(--sp-5) 0;
      padding-bottom: calc(var(--sp-5) + env(safe-area-inset-bottom));
      margin-top: var(--sp-7);
    }
    .foot {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--sp-3);
      font-size: var(--step--1);
    }
    .foot a:hover {
      color: var(--accent);
    }
  `,
})
export class Layout {}
