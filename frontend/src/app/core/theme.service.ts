import { Injectable, effect, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const KEY = 'barkast.theme';

// Match the editorial background tokens so the mobile browser chrome / PWA status bar
// blends with the page instead of flashing a default colour.
const THEME_COLOR: Record<Theme, string> = { light: '#f4ebd8', dark: '#17120c' };

/** Light/dark theme, persisted and stamped onto <html data-theme>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const value = this.theme();
      document.documentElement.setAttribute('data-theme', value);
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', THEME_COLOR[value]);
      try {
        localStorage.setItem(KEY, value);
      } catch {
        /* storage unavailable — ignore */
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private initial(): Theme {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
