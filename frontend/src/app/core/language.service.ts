import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_LOCALE, LOCALES, type Locale, type UiStrings, uiStrings } from '@cocktailapp/shared';

const KEY = 'barkast.locale';

/**
 * Display language (nl/en), persisted and stamped onto `<html lang>`. Drives both the UI chrome
 * (via {@link t}) and the catalog display overlay (CatalogService reacts to {@link locale}).
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly locale = signal<Locale>(this.initial());

  /** The full UI string table for the current locale — read as `lang.t().section.key` in templates. */
  readonly t = computed<UiStrings>(() => uiStrings(this.locale()));

  constructor() {
    effect(() => {
      const value = this.locale();
      document.documentElement.setAttribute('lang', value);
      try {
        localStorage.setItem(KEY, value);
      } catch {
        /* storage unavailable — ignore */
      }
    });
  }

  set(locale: Locale): void {
    this.locale.set(locale);
  }

  toggle(): void {
    this.locale.update((l) => (l === 'nl' ? 'en' : 'nl'));
  }

  private initial(): Locale {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
    } catch {
      /* ignore */
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() : '';
    if (nav?.startsWith('en')) return 'en';
    if (nav?.startsWith('nl')) return 'nl';
    return DEFAULT_LOCALE;
  }
}
