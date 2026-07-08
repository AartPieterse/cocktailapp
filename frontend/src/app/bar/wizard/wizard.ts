import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { CabinetService } from '../../core/cabinet.service';
import { IngredientService } from '../../services/ingredient.service';

interface WizardStep {
  key: string;
  title: string;
  hint: string;
  items: Ingredient[];
}

@Component({
  selector: 'app-wizard',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="wizard">
      <div class="top">
        <button class="quit" mat-button (click)="quit()">
          <mat-icon>close</mat-icon> Sluiten
        </button>
        <div class="progress" role="tablist" aria-label="Voortgang">
          @for (s of steps(); track s.key; let i = $index) {
            <button
              class="dot"
              [class.done]="i < current()"
              [class.active]="i === current()"
              (click)="goTo(i)"
              [attr.aria-label]="s.title"
            ></button>
          }
        </div>
        <span class="tally"><strong>{{ selection().size }}</strong> gekozen</span>
      </div>

      @if (step(); as s) {
        <section class="stage">
          <p class="eyebrow">Stap {{ current() + 1 }} van {{ steps().length }}</p>
          <h1>{{ s.title }}</h1>
          <p class="lede">{{ s.hint }}</p>

          <div class="quick">
            <button mat-button (click)="setStep(s, true)">
              <mat-icon>done_all</mat-icon> Alles
            </button>
            <button mat-button (click)="setStep(s, false)">
              <mat-icon>remove_done</mat-icon> Niets
            </button>
          </div>

          <div class="chips">
            @for (ing of s.items; track ing.id) {
              <button
                type="button"
                class="chip"
                [class.on]="selection().has(ing.id)"
                (click)="toggle(ing.id)"
                [attr.aria-pressed]="selection().has(ing.id)"
              >
                <mat-icon>{{ selection().has(ing.id) ? 'check_circle' : 'add_circle_outline' }}</mat-icon>
                {{ ing.name }}
              </button>
            } @empty {
              <p class="muted">Geen ingrediënten in deze categorie.</p>
            }
          </div>
        </section>
      }

      <footer class="nav">
        <button mat-stroked-button [disabled]="current() === 0" (click)="prev()">
          <mat-icon>arrow_back</mat-icon> Vorige
        </button>
        @if (isLast()) {
          <button mat-flat-button (click)="finish()">
            <mat-icon>check</mat-icon> Klaar — bekijk cocktails
          </button>
        } @else {
          <button mat-flat-button (click)="next()">
            Volgende <mat-icon>arrow_forward</mat-icon>
          </button>
        }
      </footer>
    </div>
  `,
  styles: `
    .wizard {
      max-width: 760px;
      margin: 0 auto;
      min-height: 60vh;
      display: flex;
      flex-direction: column;
    }
    .top {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      margin-bottom: var(--sp-5);
    }
    .quit {
      color: var(--muted);
    }
    .progress {
      display: flex;
      gap: 6px;
      flex: 1;
      justify-content: center;
      flex-wrap: wrap;
    }
    .dot {
      width: 26px;
      height: 5px;
      border: none;
      padding: 0;
      border-radius: 999px;
      background: var(--hairline);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .dot.done {
      background: color-mix(in srgb, var(--accent) 45%, var(--hairline));
    }
    .dot.active {
      background: var(--accent);
    }
    .tally {
      font-size: var(--step--1);
      color: var(--muted);
      white-space: nowrap;
    }
    .tally strong {
      color: var(--accent);
    }
    .stage {
      flex: 1;
    }
    .stage h1 {
      font-size: var(--step-4);
      margin: 0 0 var(--sp-2);
    }
    .quick {
      display: flex;
      gap: var(--sp-2);
      margin: var(--sp-4) 0 var(--sp-2);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin-top: var(--sp-3);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px 9px 10px;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      background: var(--surface);
      color: var(--ink);
      font-family: var(--font-body);
      font-size: var(--step-0);
      cursor: pointer;
      transition: all 0.14s ease;
    }
    .chip mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--faint);
    }
    .chip:hover {
      border-color: var(--accent);
    }
    .chip.on {
      background: var(--accent-soft);
      border-color: color-mix(in srgb, var(--accent) 55%, transparent);
      color: var(--accent-strong);
      font-weight: 600;
    }
    .chip.on mat-icon {
      color: var(--accent);
    }
    .nav {
      display: flex;
      justify-content: space-between;
      gap: var(--sp-3);
      margin-top: var(--sp-6);
      padding-top: var(--sp-5);
      border-top: 1px solid var(--hairline);
      position: sticky;
      bottom: 0;
      background: var(--bg);
    }
  `,
})
export class Wizard {
  private readonly cabinet = inject(CabinetService);
  private readonly ingredientService = inject(IngredientService);
  private readonly router = inject(Router);

  private readonly ingredients = signal<Ingredient[]>([]);
  readonly selection = signal<Set<string>>(new Set());
  readonly current = signal(0);

  readonly steps = computed<WizardStep[]>(() => {
    const list = this.ingredients();
    if (!list.length) return [];
    const staples = list.filter((i) => i.isStaple);
    const steps: WizardStep[] = [];
    if (staples.length) {
      steps.push({
        key: 'staples',
        title: 'Dit heb je vast al in huis',
        hint: 'IJs, suiker, citroensap… vink aan wat klopt. We hebben alvast wat aangevinkt.',
        items: staples,
      });
    }
    for (const cat of CATEGORY_ORDER) {
      const items = list.filter((i) => (i.category ?? 'other') === cat && !i.isStaple);
      if (items.length) {
        steps.push({
          key: cat,
          title: CATEGORY_LABELS_PLURAL[cat as IngredientCategory],
          hint: CATEGORY_HINTS[cat as IngredientCategory],
          items,
        });
      }
    }
    return steps;
  });

  readonly step = computed(() => this.steps()[this.current()]);
  readonly isLast = computed(() => this.current() >= this.steps().length - 1);

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

  setStep(step: WizardStep, on: boolean): void {
    const next = new Set(this.selection());
    for (const ing of step.items) {
      if (on) next.add(ing.id);
      else next.delete(ing.id);
    }
    this.selection.set(next);
  }

  goTo(i: number): void {
    this.current.set(i);
  }
  next(): void {
    if (!this.isLast()) this.current.update((v) => v + 1);
  }
  prev(): void {
    if (this.current() > 0) this.current.update((v) => v - 1);
  }

  finish(): void {
    this.cabinet.setAll(this.selection());
    this.cabinet.completeWizard();
    void this.router.navigate(['/bar']);
  }

  quit(): void {
    void this.router.navigate(['/bar']);
  }
}
