import { Component, computed, inject } from '@angular/core';
import {
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { MakeableStore } from '../../core/makeable.store';
import { IngredientGlyph } from '../../shared/ingredient-glyph/ingredient-glyph';

interface Group {
  key: IngredientCategory;
  label: string;
  items: Ingredient[];
}

/**
 * Ticking what you have, at `/bar/ingredienten`. One step under Mijn bar, which lists what the
 * ticks make; the count in the header updates as you go, so you see the effect without leaving.
 */
@Component({
  selector: 'app-cabinet',
  imports: [IngredientGlyph, RouterLink, MatIconModule],
  template: `
    <div class="page">
      <a class="crumb" routerLink="/bar">‹ {{ lang.t().bar.title }}</a>
      <header class="head">
        <div>
          <div class="title-row">
            <h1>{{ lang.t().bar.ingredientsTitle }}</h1>
            <a class="wizard-btn" routerLink="/bar/wizard">
              <mat-icon aria-hidden="true">auto_fix_high</mat-icon>
              {{ lang.t().bar.startWizard }}
            </a>
          </div>
          <p class="sub">{{ lang.t().bar.sub }}</p>
        </div>
        <div class="tally">
          <div class="makeable">{{ lang.t().bar.youCanMake(store.makeable().length) }}</div>
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
      padding-top: 28px;
      animation: rise 0.45s ease both;
    }
    .crumb {
      display: inline-block;
      margin-bottom: 12px;
      font: 600 0.875rem var(--font-body);
      color: var(--muted);
    }
    .crumb:hover {
      color: var(--accent);
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
    .title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 16px;
    }
    /* The same outlined pill as the detail page's Save / Print buttons. */
    .wizard-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      padding: 8px 14px;
      font: 600 0.813rem var(--font-body);
      color: var(--muted);
      white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
    }
    .wizard-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .wizard-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
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
      /* On a phone the tally drops under the title, so it lines up with the title, not the edge. */
      .tally {
        text-align: left;
      }
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
  protected readonly store = inject(MakeableStore);

  readonly groups = computed<Group[]>(() => {
    const list = this.store.ingredients();
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
}
