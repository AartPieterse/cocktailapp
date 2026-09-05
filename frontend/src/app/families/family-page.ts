import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type Cocktail,
  type DrinkFamily,
  DRINK_FAMILIES,
  DRINK_FAMILY_ABOUT,
  DRINK_FAMILY_LABELS,
  DRINK_FAMILY_RATIO,
} from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../core/language.service';
import { CocktailService } from '../services/cocktail.service';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';

/**
 * One family: what the shape is, the ratio it runs on, and every recipe in the catalog that is
 * built that way. The whole list, not a sample — the point of arriving here from a recipe is to see
 * the other forty-one drinks that share its structure.
 */
@Component({
  selector: 'app-family-page',
  imports: [RouterLink, CocktailCard],
  template: `
    @if (key()) {
      <div class="page">
        <a class="crumb" routerLink="/families">&larr; {{ lang.t().family.allFamilies }}</a>

        <header class="hero">
          <p class="eyebrow">{{ lang.t().family.eyebrow }}</p>
          <h1>{{ label() }}</h1>
          <p class="ratio">{{ ratio() }}</p>
          <p class="lede">{{ about() }}</p>
          <p class="count">{{ lang.t().family.inFamily(recipes().length) }}</p>
        </header>

        <section class="uses">
          <h2>{{ lang.t().family.recipesIn }}</h2>
          <div class="grid">
            @for (c of recipes(); track c.id) {
              <app-cocktail-card [cocktail]="c" />
            }
          </div>
        </section>

        <nav class="others">
          @for (o of others(); track o.id) {
            <a [routerLink]="['/families', o.id]">{{ o.label }}</a>
          }
        </nav>
      </div>
    } @else {
      <div class="page notfound">
        <p class="eyebrow">404</p>
        <h1>{{ lang.t().family.notFound }}</h1>
        <a class="crumb" routerLink="/families">{{ lang.t().family.allFamilies }}</a>
      </div>
    }
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 28px 0 56px;
      animation: rise 0.45s ease both;
    }
    .crumb {
      font: 600 0.875rem var(--font-body);
      color: var(--muted);
    }
    .crumb:hover {
      color: var(--accent);
    }
    .hero {
      margin-top: 16px;
      padding-bottom: 26px;
      border-bottom: 2px solid var(--ink);
    }
    .hero h1 {
      font-size: 2.75rem;
      letter-spacing: -0.03em;
      margin: 6px 0 0;
    }
    .ratio {
      margin: 10px 0 0;
      font: 600 1rem var(--font-body);
      color: var(--accent);
    }
    .lede {
      font-size: 1.0625rem;
      color: var(--muted);
      margin: 12px 0 0;
      max-width: 56ch;
    }
    .count {
      margin: 10px 0 0;
      font: 500 0.875rem var(--font-body);
      color: var(--faint);
    }
    .uses {
      margin-top: 32px;
    }
    .uses h2 {
      font-size: 1.3rem;
      margin: 0 0 18px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }
    .others {
      margin-top: 34px;
      padding-top: 20px;
      border-top: 1px solid var(--hairline);
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .others a {
      font: 600 0.875rem var(--font-body);
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .notfound {
      padding-top: 64px;
    }
    @media (max-width: 760px) {
      .hero h1 {
        font-size: 2rem;
      }
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 520px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FamilyPage {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);

  /** Route param (`/families/:family`), bound via withComponentInputBinding. */
  readonly family = input<string>('');

  /** The param narrowed to a real family, or null — an unknown slug renders the 404 branch. */
  protected readonly key = computed<DrinkFamily | null>(() => {
    const value = this.family();
    return (DRINK_FAMILIES as readonly string[]).includes(value) ? (value as DrinkFamily) : null;
  });

  protected readonly label = computed(() => {
    const k = this.key();
    return k ? DRINK_FAMILY_LABELS[this.lang.locale()][k] : '';
  });
  protected readonly ratio = computed(() => {
    const k = this.key();
    return k ? DRINK_FAMILY_RATIO[this.lang.locale()][k] : '';
  });
  protected readonly about = computed(() => {
    const k = this.key();
    return k ? DRINK_FAMILY_ABOUT[this.lang.locale()][k] : '';
  });

  private readonly cocktails = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  protected readonly recipes = computed(() => {
    const k = this.key();
    return k ? this.cocktails().filter((c) => c.family === k) : [];
  });

  protected readonly others = computed(() => {
    const locale = this.lang.locale();
    const current = this.key();
    return DRINK_FAMILIES.filter((f) => f !== current).map((f) => ({
      id: f,
      label: DRINK_FAMILY_LABELS[locale][f],
    }));
  });
}
