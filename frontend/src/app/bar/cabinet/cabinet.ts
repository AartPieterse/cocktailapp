import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  expandCabinet,
  type Ingredient,
  type IngredientCategory,
  type MakeableResult,
} from '@cocktailapp/shared';
import { catchError, combineLatest, of, switchMap } from 'rxjs';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { SubstitutesService } from '../../core/substitutes.service';
import { CocktailService } from '../../services/cocktail.service';
import { IngredientService } from '../../services/ingredient.service';
import { IngredientGlyph } from '../../shared/ingredient-glyph/ingredient-glyph';

interface Group {
  key: IngredientCategory;
  label: string;
  items: Ingredient[];
}

@Component({
  selector: 'app-cabinet',
  imports: [IngredientGlyph],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h1>{{ lang.t().bar.title }}</h1>
          <p class="sub">{{ lang.t().bar.sub }}</p>
        </div>
        <div class="tally">
          <div class="makeable">{{ lang.t().bar.youCanMake(makeableCount()) }}</div>
          <div class="selected">{{ lang.t().bar.selected(cabinet.count()) }}</div>
        </div>
      </header>

      <div class="groups">
        @for (g of groups(); track g.key) {
          <section class="group">
            <div class="group-label">{{ g.label }}</div>
            <div class="chips">
              @for (it of g.items; track it.id) {
                <button
                  type="button"
                  class="chip"
                  [class.on]="cabinet.has(it.id)"
                  (click)="cabinet.toggle(it.id)"
                  [attr.aria-pressed]="cabinet.has(it.id)"
                >
                  <span class="glyph"><app-ingredient-glyph [ingId]="it.id" [cat]="it.category" /></span>
                  {{ it.name }}
                </button>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .page {
      padding-top: 44px;
      animation: rise 0.45s ease both;
    }
    .head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 16px;
    }
    .head h1 {
      font-size: var(--step-4);
      letter-spacing: -0.025em;
      margin: 0;
    }
    .sub {
      color: var(--muted);
      margin: 6px 0 0;
      font-size: 0.938rem;
    }
    .tally {
      text-align: right;
      flex: none;
    }
    .makeable {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.25rem;
      color: var(--ok);
    }
    .selected {
      font: 600 0.813rem var(--font-body);
      color: var(--faint);
      margin-top: 2px;
    }
    .groups {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 48px;
      margin-top: 28px;
    }
    .group {
      padding: 8px 0;
    }
    .group-label {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      color: var(--dim);
      text-transform: uppercase;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 14px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px 6px 7px;
      border-radius: var(--radius-pill);
      border: 1.6px solid var(--hairline);
      background: var(--surface);
      color: var(--muted);
      font: 600 0.844rem var(--font-body);
      line-height: 1;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px -12px rgba(36, 30, 23, 0.5);
    }
    .chip.on {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }
    .glyph {
      width: 23px;
      height: 23px;
      flex: none;
      display: block;
    }
    @media (max-width: 760px) {
      .groups {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
  `,
})
export class Cabinet {
  protected readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  private readonly subs = inject(SubstitutesService);
  private readonly ingredientService = inject(IngredientService);
  private readonly cocktailService = inject(CocktailService);

  private readonly ingredients = signal<Ingredient[]>([]);
  readonly makeableCount = signal(0);

  readonly groups = computed<Group[]>(() => {
    const list = this.ingredients();
    const labels = CATEGORY_LABELS_PLURAL[this.lang.locale()];
    const byCat = new Map<IngredientCategory, Ingredient[]>();
    for (const ing of list) {
      const key = (ing.category ?? 'other') as IngredientCategory;
      const arr = byCat.get(key) ?? [];
      arr.push(ing);
      byCat.set(key, arr);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      key: c,
      label: labels[c],
      items: (byCat.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  });

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    combineLatest([
      toObservable(this.cabinet.ids),
      toObservable(this.subs.enabled),
      toObservable(this.ingredients),
    ])
      .pipe(
        switchMap(([ids, substitutes, ingredients]) => {
          if (!ids.length) return of<MakeableResult[]>([]);
          const query = expandCabinet(ids, ingredients, { substitutes });
          return this.cocktailService.makeable(query, 0).pipe(catchError(() => of<MakeableResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => this.makeableCount.set(res.length));
  }
}
