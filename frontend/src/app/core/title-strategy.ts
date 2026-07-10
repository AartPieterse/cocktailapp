import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import type { UiStrings } from '@cocktailapp/shared';
import { LanguageService } from './language.service';

/** Keys into `UiStrings['titles']`, set as a route's `title` to get a localized tab title. */
type TitleKey = keyof UiStrings['titles'];

/**
 * Localized, reactive document titles. A route sets `title: '<key>'` where the key indexes
 * {@link UiStrings.titles}; this strategy translates it for the current locale and re-applies the
 * title when the language switches. Routes with no `title` (e.g. cocktail detail, which sets its
 * own title from the drink name) are left untouched.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly lang = inject(LanguageService);
  private currentKey: TitleKey | null = null;

  constructor() {
    super();
    // Re-translate the active route title whenever the locale changes.
    effect(() => {
      const t = this.lang.t().titles;
      if (this.currentKey && t[this.currentKey]) this.title.setTitle(t[this.currentKey]);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot) as TitleKey | undefined;
    this.currentKey = key ?? null;
    const titles = this.lang.t().titles;
    if (key && titles[key]) this.title.setTitle(titles[key]);
  }
}
