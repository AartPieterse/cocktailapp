import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { AnalyticsService } from '../../core/analytics.service';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { IngredientService } from '../../services/ingredient.service';
import { IngredientGlyph } from '../../shared/ingredient-glyph/ingredient-glyph';

interface WizardStep {
  key: string;
  title: string;
  hint: string;
  items: Ingredient[];
}

@Component({
  selector: 'app-wizard',
  imports: [IngredientGlyph],
  template: `
    <div class="stage">
      <div class="card">
        <div class="card-top">
          <div class="top-row">
            <span class="step-of">{{ lang.t().wizard.step(current() + 1, steps().length) }}</span>
            <button class="skip" type="button" (click)="quit()">{{ lang.t().wizard.skip }}</button>
          </div>
          <div class="track"><div class="fill" [style.width]="pct()"></div></div>
        </div>

        @if (step(); as s) {
          <div class="card-body">
            <h1>{{ s.title }}</h1>
            <p class="hint">{{ s.hint }}</p>
            <div class="chips">
              @for (ing of s.items; track ing.id) {
                <button
                  type="button"
                  class="chip"
                  [class.on]="selection().has(ing.id)"
                  (click)="toggle(ing.id)"
                  [attr.aria-pressed]="selection().has(ing.id)"
                >
                  <span class="glyph"><app-ingredient-glyph [ingId]="ing.id" [cat]="ing.category" /></span>
                  {{ ing.name }}
                </button>
              } @empty {
                <p class="muted">{{ lang.t().wizard.emptyCategory }}</p>
              }
            </div>
          </div>
        }

        <div class="card-foot">
          @if (current() > 0) {
            <button class="btn btn-back" type="button" (click)="prev()">{{ lang.t().wizard.back }}</button>
          }
          <button class="btn btn-next" type="button" (click)="next()">
            {{ isLast() ? lang.t().wizard.finish : lang.t().wizard.next }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .stage {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: calc(100vh - 74px);
      padding: 56px 0;
      animation: rise 0.4s ease both;
    }
    .card {
      width: 640px;
      max-width: 100%;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: 26px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    .card-top {
      padding: 26px 32px 4px;
    }
    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .step-of {
      font: 600 0.813rem var(--font-body);
      color: var(--muted);
    }
    .skip {
      background: none;
      border: none;
      font: 600 0.813rem var(--font-body);
      color: var(--dim);
      cursor: pointer;
    }
    .track {
      margin-top: 12px;
      height: 5px;
      background: var(--surface-3);
      border-radius: 5px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: var(--accent);
      border-radius: 5px;
      transition: width 0.35s ease;
    }
    .card-body {
      padding: 24px 32px 8px;
    }
    .card-body h1 {
      font-size: 2rem;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .hint {
      color: var(--muted);
      margin: 8px 0 0;
      font-size: 0.938rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 24px;
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
    .card-foot {
      padding: 20px 32px 26px;
      margin-top: 12px;
      border-top: 1px solid var(--hairline-soft);
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 14px;
      border-radius: 14px;
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
      border: none;
    }
    .btn-back {
      flex: none;
      padding: 14px 24px;
      background: none;
      border: 1.5px solid var(--hairline);
      color: var(--muted);
    }
    .btn-next {
      flex: 1;
      background: var(--accent);
      color: #fff;
    }
  `,
})
export class Wizard {
  private readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  private readonly ingredientService = inject(IngredientService);
  private readonly router = inject(Router);

  private readonly ingredients = signal<Ingredient[]>([]);
  readonly selection = signal<Set<string>>(new Set());
  readonly current = signal(0);

  readonly steps = computed<WizardStep[]>(() => {
    const list = this.ingredients();
    if (!list.length) return [];
    const locale = this.lang.locale();
    const labels = CATEGORY_LABELS_PLURAL[locale];
    const hints = CATEGORY_HINTS[locale];
    const staples = list.filter((i) => i.isStaple);
    const steps: WizardStep[] = [];
    if (staples.length) {
      steps.push({
        key: 'staples',
        title: this.lang.t().wizard.staplesTitle,
        hint: this.lang.t().wizard.staplesHint,
        items: staples,
      });
    }
    for (const cat of CATEGORY_ORDER) {
      const items = list.filter((i) => (i.category ?? 'other') === cat && !i.isStaple);
      if (items.length) {
        steps.push({
          key: cat,
          title: labels[cat as IngredientCategory],
          hint: hints[cat as IngredientCategory],
          items,
        });
      }
    }
    return steps;
  });

  readonly step = computed(() => this.steps()[this.current()]);
  readonly isLast = computed(() => this.current() >= this.steps().length - 1);
  readonly pct = computed(() => {
    const n = this.steps().length || 1;
    return Math.round(((this.current() + 1) / n) * 100) + '%';
  });

  private readonly analytics = inject(AnalyticsService);

  constructor() {
    this.ingredientService.getAll().subscribe((list) => {
      this.ingredients.set(list);
      const init = new Set(this.cabinet.ids());
      // First run: pre-check the pantry staples so building a bar is fast.
      if (!this.cabinet.wizardDone()) {
        for (const ing of list) if (ing.isStaple) init.add(ing.id);
      }
      this.selection.set(init);
    });

    // Keep the step index valid if the steps list changes.
    effect(() => {
      const n = this.steps().length;
      if (n && this.current() > n - 1) this.current.set(n - 1);
    });
  }

  toggle(id: string): void {
    const next = new Set(this.selection());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selection.set(next);
  }

  next(): void {
    if (this.isLast()) this.finish();
    else this.current.update((v) => v + 1);
  }
  prev(): void {
    if (this.current() > 0) this.current.update((v) => v - 1);
  }

  finish(): void {
    this.cabinet.setAll(this.selection());
    this.cabinet.completeWizard();
    this.analytics.track('wizard_complete');
    void this.router.navigate(['/ontdek']);
  }

  quit(): void {
    void this.router.navigate(['/ontdek']);
  }
}
