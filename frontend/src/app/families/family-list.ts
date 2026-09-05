import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type Cocktail,
  DRINK_FAMILIES,
  DRINK_FAMILY_LABELS,
  DRINK_FAMILY_RATIO,
  DRINK_FAMILY_ABOUT,
} from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../core/language.service';
import { CocktailService } from '../services/cocktail.service';

/**
 * The nine families, with how many recipes sit in each.
 *
 * This is the index behind the one line every recipe now carries ("Dit is een sour · 2 sterk :
 * 1 zuur : 1 zoet"). The counts come from the catalog rather than a constant, so a family that
 * gains or loses a recipe reports the truth without anyone remembering to edit a number.
 */
@Component({
  selector: 'app-family-list',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <p class="eyebrow">{{ lang.t().family.eyebrow }}</p>
        <h1>{{ lang.t().family.title }}</h1>
        <p class="lede">{{ lang.t().family.intro }}</p>
      </header>

      <div class="grid">
        @for (f of families(); track f.id) {
          <a class="card" [routerLink]="['/families', f.id]">
            <h2>{{ f.label }}</h2>
            <p class="ratio">{{ f.ratio }}</p>
            <p class="sub">{{ f.about }}</p>
            <span class="count">{{ lang.t().family.inFamily(f.count) }}</span>
          </a>
        }
      </div>
    </div>
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 36px 0 56px;
      animation: rise 0.45s ease both;
    }
    .head {
      padding-bottom: 26px;
      border-bottom: 2px solid var(--ink);
    }
    .head h1 {
      font-size: 2.75rem;
      letter-spacing: -0.03em;
      margin: 8px 0 12px;
    }
    .lede {
      max-width: 56ch;
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 26px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 22px 24px;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow);
      color: inherit;
    }
    .card h2 {
      font-size: 1.4rem;
      margin: 0;
    }
    .ratio {
      margin: 0;
      font: 600 0.813rem var(--font-body);
      color: var(--accent);
    }
    .sub {
      margin: 4px 0 0;
      font-size: 0.906rem;
      line-height: 1.5;
      color: var(--muted);
    }
    .count {
      margin-top: auto;
      padding-top: 14px;
      font: 500 0.813rem var(--font-body);
      color: var(--faint);
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 560px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .head h1 {
        font-size: 2rem;
      }
    }
  `,
})
export class FamilyList {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);

  private readonly cocktails = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  protected readonly families = computed(() => {
    const locale = this.lang.locale();
    const all = this.cocktails();
    return DRINK_FAMILIES.map((id) => ({
      id,
      label: DRINK_FAMILY_LABELS[locale][id],
      ratio: DRINK_FAMILY_RATIO[locale][id],
      about: DRINK_FAMILY_ABOUT[locale][id],
      count: all.filter((c) => c.family === id).length,
    }));
  });
}
