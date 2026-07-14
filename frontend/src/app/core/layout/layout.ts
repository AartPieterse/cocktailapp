import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LanguageService } from '../language.service';
import { Navbar } from '../navbar/navbar';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { InstallPrompt } from '../install-prompt/install-prompt';
import { SyncService } from '../sync/sync.service';
import { UpdatePrompt } from '../update-prompt/update-prompt';
import { Toast } from '../toast/toast';
import { UnlockWatcher } from '../unlock-watcher.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, Navbar, BottomNav, InstallPrompt, UpdatePrompt, Toast],
  template: `
    <app-navbar />
    <main>
      <div class="container page">
        <router-outlet />
      </div>
    </main>
    <footer class="no-print">
      <div class="container foot">
        <span>{{ lang.t().common.appName }} — <span class="muted">{{ lang.t().common.tagline }}</span></span>
        <span class="muted">
          <a routerLink="/cocktails">{{ lang.t().nav.cocktails }}</a> ·
          <a routerLink="/bar">{{ lang.t().nav.myBar }}</a>
        </span>
      </div>
    </footer>
    <app-install-prompt />
    <app-update-prompt />
    <app-bottom-nav />
    <app-toast />
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
    /* Clear the fixed bottom tab bar on mobile so the footer isn't hidden behind it. */
    @media (max-width: 780px) {
      footer {
        margin-bottom: calc(60px + env(safe-area-inset-bottom));
      }
    }
  `,
})
export class Layout {
  protected readonly lang = inject(LanguageService);
  // Instantiated with the shell so cloud sync wires up at startup (inert when authEnabled is false).
  private readonly sync = inject(SyncService);
  // Instantiating the watcher here starts the app-wide "unlock/added" toast pipeline.
  private readonly unlockWatcher = inject(UnlockWatcher);
}
