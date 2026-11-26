import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { Cocktail, Ingredient } from '@cocktailapp/shared';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../core/language.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';
import { IngredientGlyph } from '../shared/ingredient-glyph/ingredient-glyph';
import { TECHNIQUES, techniqueById } from './techniques';

/**
 * One technique lesson. The only page in the app that says "do this now" without asking anyone to
 * open a bottle: every drill is alcohol-free by construction.
 *
 * There is deliberately no progress state — no "I can do this" checkbox, no percentage, no badge.
 * A self-declared, unverifiable tick is a progress mechanic with no informational content, and a
 * counter that only rises is the pattern this product removed everywhere else.
 */
@Component({
  selector: 'app-technique-page',
  imports: [RouterLink, MatIconModule, CocktailCard, IngredientGlyph],
  template: `
    @if (lesson(); as l) {
      <div class="page">
        <a class="crumb" routerLink="/techniek">&larr; {{ lang.t().nav.technique }}</a>

        <header class="hero">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 64 88" width="82" height="82" fill="none" stroke="currentColor"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 26h24l4 46a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z"></path>
              <path d="M18 26l2-10h24l2 10"></path>
              <path d="M23 16l1.5-7h15L41 16"></path>
            </svg>
          </span>
          <div>
            <h1>{{ l.title }}</h1>
            <p class="lede">{{ l.lede }}</p>
            @if (usedIn().length) {
              <p class="count">{{ lang.t().technique.usedInCount(usedIn().length) }}</p>
            }
          </div>
        </header>

        <section class="sec">
          <h2>{{ lang.t().technique.why }}</h2>
          @for (p of l.why; track $index) {
            <p>{{ p }}</p>
          }
        </section>

        <section class="sec">
          <h2>{{ lang.t().technique.how }}</h2>
          @for (step of l.steps; track $index) {
            <div class="step">
              <span class="n">{{ $index + 1 }}</span>
              <span class="t">{{ step }}</span>
            </div>
          }
        </section>

        <section class="sec">
          <h2>{{ lang.t().technique.wrong }}</h2>
          <div class="miss">
            @for (m of l.mistakes; track m.title) {
              <div>
                <b>{{ m.title }}</b>
                {{ m.body }}
              </div>
            }
          </div>
        </section>

        <section class="sec">
          <h2>{{ lang.t().technique.tell }}</h2>
          <p>{{ l.tell }}</p>
        </section>

        <!-- Same card as the lesson list: one hairline all round, ink headings, the kit as the same
             chips Mijn bar uses. The time is a fact about the drill, so it reads as one, not as a button. -->
        <section class="drill">
          <div class="drill-head">
            <h2>{{ lang.t().technique.practise }}</h2>
            @if (l.drill.seconds) {
              <span class="timer">
                <mat-icon aria-hidden="true">timer</mat-icon>
                {{ lang.t().technique.seconds(l.drill.seconds) }}
              </span>
            }
          </div>
          <p>{{ l.drill.body }}</p>
          @if (l.drill.kit.length) {
            <div class="kit-label">{{ lang.t().technique.youNeed }}</div>
            <ul class="kit">
              @for (id of l.drill.kit; track id) {
                <li class="kit-chip">
                  <span class="g"><app-ingredient-glyph [ingId]="id" [cat]="catOf(id)" /></span>
                  {{ nameOf(id) }}
                </li>
              }
            </ul>
          }
        </section>

        @if (usedIn().length) {
          <section class="uses">
            <h2>{{ lang.t().technique.usedIn }}</h2>
            <div class="grid">
              @for (c of usedIn().slice(0, 6); track c.id) {
                <app-cocktail-card [cocktail]="c" />
              }
            </div>
          </section>
        }

        <nav class="others">
          @for (t of others(); track t.id) {
            <a [routerLink]="['/techniek', t.id]">{{ t.title }}</a>
          }
        </nav>
      </div>
    } @else {
      <div class="page notfound">
        <p class="eyebrow">404</p>
        <h1>{{ lang.t().technique.notFound }}</h1>
        <a class="crumb" routerLink="/techniek">{{ lang.t().technique.allLessons }}</a>
      </div>
    }
  `,
  styles: `
    .page {
      max-width: 820px;
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
      display: flex;
      align-items: center;
      gap: 26px;
      margin-top: 16px;
      padding-bottom: 26px;
      border-bottom: 2px solid var(--ink);
    }
    .mark {
      flex: none;
      color: var(--ink);
      display: inline-flex;
    }
    .hero h1 {
      font-size: 2.75rem;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .hero .lede {
      font-size: 1.125rem;
      color: var(--muted);
      margin: 8px 0 0;
      max-width: 46ch;
    }
    .count {
      margin: 8px 0 0;
      font: 500 0.875rem var(--font-body);
      color: var(--faint);
    }
    .sec {
      padding: 26px 0;
      border-bottom: 1px solid var(--hairline);
    }
    .sec h2 {
      font-size: 1.3rem;
      margin: 0 0 10px;
    }
    .sec p {
      margin: 0 0 10px;
      font-size: 1rem;
      color: var(--muted);
    }
    .sec p:last-child {
      margin-bottom: 0;
    }
    .step {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 14px;
      padding: 10px 0;
    }
    .step .n {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--ink);
      color: var(--bg);
      display: grid;
      place-items: center;
      font: 600 0.813rem var(--font-body);
    }
    .step .t {
      font-size: 1rem;
      padding-top: 3px;
    }
    .miss {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .miss div {
      padding-left: 16px;
      border-left: 2px solid color-mix(in srgb, var(--warn) 45%, transparent);
      color: var(--muted);
    }
    .miss b {
      font-family: var(--font-display);
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
      color: var(--ink);
    }
    .drill {
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-lg);
      padding: 22px 24px;
      margin-top: 26px;
    }
    .drill-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px 16px;
      margin-bottom: 10px;
    }
    .drill h2 {
      font-size: 1.3rem;
      margin: 0;
    }
    .drill p {
      font-size: 1rem;
      color: var(--muted);
      margin: 0;
    }
    .timer {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 600 0.813rem var(--font-body);
      color: var(--muted);
    }
    .timer mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent);
    }
    .kit-label {
      margin: 18px 0 10px;
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .kit {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    /* The chip Mijn bar uses, minus the button: here it only names what to fetch. */
    .kit-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px 6px 7px;
      border-radius: var(--radius-pill);
      border: 1.6px solid var(--hairline);
      background: var(--bg);
      color: var(--ink);
      font: 600 0.844rem var(--font-body);
      line-height: 1;
    }
    .kit-chip .g {
      width: 23px;
      height: 23px;
      flex: none;
      display: block;
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
      .hero {
        gap: 18px;
      }
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
export class TechniquePage {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  /** Route param, bound via withComponentInputBinding. */
  readonly id = input<string>('');

  private readonly technique = computed(() => techniqueById(this.id()));
  protected readonly lesson = computed(() => {
    const t = this.technique();
    return t ? t.copy[this.lang.locale()] : undefined;
  });

  private readonly cocktails = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );
  private readonly ingredients = toSignal(
    this.ingredientService.getAll().pipe(catchError(() => of<Ingredient[]>([]))),
    { initialValue: [] as Ingredient[] },
  );

  /** Recipes that use this technique — free for the four lessons keyed to a method. */
  protected readonly usedIn = computed(() => {
    const method = this.technique()?.method;
    if (!method) return [];
    return this.cocktails().filter((c) => c.method === method);
  });

  protected readonly others = computed(() => {
    const locale = this.lang.locale();
    const current = this.id();
    return TECHNIQUES.filter((t) => t.id !== current).map((t) => ({
      id: t.id,
      title: t.copy[locale].title,
    }));
  });

  protected catOf(id: string): string | undefined {
    return this.ingredients().find((i) => i.id === id)?.category;
  }

  protected nameOf(id: string): string {
    return this.ingredients().find((i) => i.id === id)?.name ?? id;
  }
}
