import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import type { Cocktail, Ingredient } from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { FACTS, factOfTheDay } from '../../core/facts';
import { LanguageService } from '../../core/language.service';
import { CocktailService } from '../../services/cocktail.service';
import { IngredientService } from '../../services/ingredient.service';

/**
 * "Wist je dat?" card for the home sidebar. Opens on a day-seeded fact and cycles to the next one
 * on tap, in the display language.
 *
 * A fact about a drink links straight to that recipe. A fact about a bottle only names its subject:
 * there is no ingredient page to send anyone to, and the honest home for those facts is the recipe
 * detail of a drink that actually uses it — see `factForCocktail`.
 */
@Component({
  selector: 'app-fact-card',
  imports: [MatIconModule, RouterLink],
  template: `
    <div class="fact">
      <div class="head">
        <span class="spark"><mat-icon>auto_awesome</mat-icon></span>
        <span class="eyebrow">{{ lang.t().facts.eyebrow }}</span>
      </div>
      <p class="text">{{ text() }}</p>
      <div class="foot">
        <button class="more" type="button" (click)="next()">{{ lang.t().facts.next }}</button>
        @if (cocktail(); as c) {
          <a class="subject" [routerLink]="['/cocktails', c.id]">{{
            lang.t().facts.readMore(c.name)
          }}</a>
        } @else if (ingredientName(); as name) {
          <span class="subject muted">{{ name }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .fact {
      display: block;
      width: 100%;
      text-align: left;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 20px;
      font-family: var(--font-body);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .fact:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .head {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .spark {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex: none;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .spark mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }
    .eyebrow {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.16em;
      color: var(--accent);
      text-transform: uppercase;
    }
    .text {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1.0625rem;
      line-height: 1.4;
      letter-spacing: -0.01em;
      margin: 12px 0 0;
      text-wrap: pretty;
    }
    .foot {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 12px;
    }
    .more {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font: 600 0.75rem var(--font-body);
      color: var(--accent);
    }
    .subject {
      font: 600 0.75rem var(--font-body);
      color: var(--accent);
    }
    .subject:hover {
      text-decoration: underline;
    }
    .subject.muted {
      color: var(--faint);
    }
    .subject.muted:hover {
      text-decoration: none;
    }
  `,
})
export class FactCard {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  private readonly index = signal(factOfTheDay());
  private readonly fact = computed(() => FACTS[this.index()]);

  protected readonly text = computed(() => this.fact().text[this.lang.locale()]);

  private readonly cocktails = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );
  private readonly ingredients = toSignal(
    this.ingredientService.getAll().pipe(catchError(() => of<Ingredient[]>([]))),
    { initialValue: [] as Ingredient[] },
  );

  /** The catalog cocktail this fact is about — the name comes from the catalog, so it translates. */
  protected readonly cocktail = computed(() => {
    const id = this.fact().cocktailId;
    return id ? (this.cocktails().find((c) => c.id === id) ?? null) : null;
  });

  protected readonly ingredientName = computed(() => {
    const id = this.fact().ingredientId;
    return id ? (this.ingredients().find((i) => i.id === id)?.name ?? null) : null;
  });

  next(): void {
    this.index.update((i) => (i + 1) % FACTS.length);
  }
}
