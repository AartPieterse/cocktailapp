import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  type Cocktail,
  DIFFICULTY_LABELS,
  DRINK_FAMILY_LABELS,
  DRINK_FAMILY_RATIO,
  GLASSWARE_LABELS,
  type MakeableResult,
  METHOD_LABELS,
} from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { CabinetService } from '../core/cabinet.service';
import { LanguageService } from '../core/language.service';
import { MakeableStore } from '../core/makeable.store';
import { CocktailService } from '../services/cocktail.service';
import { GlassArt } from '../shared/glass-art/glass-art';
import { glassSpecFor, tintFor } from '../shared/cocktail-visual';
import { dayIndex, ingredientNames, pickOfTheDay, resultKey } from './discover';
import { LearnRow } from './learn-row/learn-row';
import { Onboarding } from './onboarding/onboarding';

/** A drink the page can feature: a makeable result, or a plain menu entry when nothing is. */
type Featured = Pick<MakeableResult, 'cocktail' | 'variation' | 'parentName'>;

/**
 * "Ontdek", the home screen. Top to bottom:
 *
 * 1. **The day's pick.** One drink from what the bar makes, set by the calendar day so it reads
 *    like a menu rather than a slot machine. "Something else" steps through the same pool.
 * 2. **Behind the bar**: a technique, a family and a fact, none of which needs a bottle.
 *
 * What is deliberately NOT here: the full list of what the bar makes. That is the answer to what
 * you ticked, so it lives on Mijn bar, next to the count and the switches that change it.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink, MatIconModule, GlassArt, LearnRow, Onboarding],
  template: `
    @if (showOnboarding()) {
      <app-onboarding />
    } @else {
      <div class="page">
        <!-- 1. the day's pick -->
        @if (loading() && !featured()) {
          <div class="pick">
            <div class="pick-copy">
              <div class="skeleton sk-line short"></div>
              <div class="skeleton sk-title"></div>
              <div class="skeleton sk-line"></div>
              <div class="skeleton sk-line"></div>
            </div>
            <div class="skeleton pick-art"></div>
          </div>
        } @else if (featured(); as f) {
          <section class="pick" [attr.aria-label]="pickEyebrow()">
            <div class="pick-copy">
              <p class="eyebrow">{{ greeting() }} · {{ pickEyebrow() }}</p>
              <h1 class="pick-name">
                <a [routerLink]="['/cocktails', f.cocktail.id]" [queryParams]="query(f)">{{ f.cocktail.name }}</a>
              </h1>
              @if (f.variation && f.parentName) {
                <p class="variation-of">{{ lang.t().common.variationOf(f.parentName) }}</p>
              }
              @if (pickFamily(); as fam) {
                <p class="family-line">
                  <a [routerLink]="['/families', fam.id]">{{ fam.label }}</a>
                  <span class="ratio">{{ fam.ratio }}</span>
                </p>
              }
              @if (pickDescription()) {
                <p class="desc">{{ pickDescription() }}</p>
              }
              <ul class="ings" [attr.aria-label]="lang.t().detail.ingredients">
                @for (n of pickIngredients(); track n) {
                  <li>{{ n }}</li>
                }
              </ul>
              @if (pickMeta()) {
                <p class="meta">{{ pickMeta() }}</p>
              }
              <div class="cta">
                <a class="btn btn-primary" [routerLink]="['/cocktails', f.cocktail.id]" [queryParams]="query(f)">
                  {{ lang.t().home.toRecipe }}
                </a>
                @if (pool().length > 1) {
                  <button class="btn btn-ghost" type="button" (click)="another()">
                    <mat-icon>autorenew</mat-icon> {{ lang.t().home.pickAnother }}
                  </button>
                }
              </div>
            </div>
            <a
              class="pick-art"
              [style.background]="pickTint()"
              [routerLink]="['/cocktails', f.cocktail.id]"
              [queryParams]="query(f)"
              [attr.aria-label]="f.cocktail.name"
              tabindex="-1"
            >
              <!-- Keyed on the drink, so "something else" replays the entrance instead of swapping in place. -->
              @for (g of [f]; track key(g)) {
                <div class="pick-glass"><app-glass-art [spec]="pickSpec()" /></div>
              }
            </a>
          </section>
        }

        <!-- 2. behind the bar -->
        <app-learn-row [makeable]="store.makeableCocktails()" />
      </div>
    }
  `,
  styles: `
    .page {
      padding-bottom: 56px;
      animation: rise 0.5s ease both;
    }
    .eyebrow {
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.18em;
      color: var(--accent);
      text-transform: uppercase;
      margin: 0;
    }

    /* ---- the day's pick ---- */
    .pick {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 48px;
      align-items: center;
      padding: 48px 0 56px;
    }
    .pick-name {
      font-size: var(--step-5);
      line-height: 1.02;
      letter-spacing: -0.03em;
      margin: 14px 0 0;
      overflow-wrap: anywhere;
    }
    .pick-name a {
      color: inherit;
    }
    .variation-of {
      margin: 6px 0 0;
      color: var(--faint);
      font: 600 0.813rem var(--font-body);
    }
    .family-line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 12px;
      margin: 14px 0 0;
    }
    .family-line a {
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--hairline);
    }
    .family-line a:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .ratio {
      font-family: var(--font-display);
      font-style: italic;
      color: var(--muted);
    }
    .desc {
      margin: 18px 0 0;
      max-width: 48ch;
      font-size: 1.0625rem;
      line-height: 1.55;
      color: var(--muted);
      text-wrap: pretty;
    }
    .ings {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      list-style: none;
      padding: 0;
      margin: 18px 0 0;
    }
    .ings li {
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      font: 500 0.813rem var(--font-body);
      color: var(--ink);
    }
    .meta {
      margin: 14px 0 0;
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .cta {
      display: flex;
      gap: 12px;
      margin-top: 28px;
      flex-wrap: wrap;
    }
    .pick-art {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 1 / 1;
      max-height: 460px;
      width: 100%;
      border-radius: 28px;
      overflow: hidden;
      /* The tint is pale; on the cream light theme it needs an edge to read as a panel at all. */
      box-shadow: inset 0 0 0 1px var(--hairline-soft), var(--shadow);
      transition: background 0.4s ease;
    }
    /* A soft floor under the glass, so it stands on something rather than floating in a box. */
    .pick-art::after {
      content: '';
      position: absolute;
      left: 22%;
      right: 22%;
      bottom: 12%;
      height: 14px;
      border-radius: 50%;
      background: rgba(36, 30, 23, 0.12);
      filter: blur(6px);
    }
    .pick-glass {
      position: relative;
      z-index: 1;
      width: min(62%, 280px);
      aspect-ratio: 3 / 4;
      animation: pick-in 0.5s ease both, floaty 6s ease-in-out 0.5s infinite;
    }
    @keyframes pick-in {
      from {
        opacity: 0;
        transform: translateY(14px) scale(0.97);
      }
    }

    /* ---- buttons ---- */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: var(--radius-pill);
      padding: 13px 24px;
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
      border: 1.5px solid transparent;
      background: none;
      transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .btn:hover {
      transform: translateY(-1px);
    }
    .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .btn-primary {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .btn-ghost {
      border-color: color-mix(in srgb, var(--ink) 20%, transparent);
      color: var(--muted);
    }
    .btn-ghost:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* ---- loading ---- */
    .sk-line {
      height: 14px;
      border-radius: 7px;
      margin-top: 14px;
      max-width: 420px;
    }
    .sk-line.short {
      max-width: 180px;
    }
    .sk-title {
      height: 64px;
      border-radius: 12px;
      margin-top: 18px;
      max-width: 360px;
    }

    @media (max-width: 900px) {
      .pick {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
        padding: 20px 0 40px;
      }
      .pick-art {
        order: -1;
        aspect-ratio: auto;
        height: 280px;
      }
      .pick-glass {
        width: 180px;
        height: 240px;
      }
    }
    @media (max-width: 520px) {
      .pick-art {
        height: 240px;
        border-radius: var(--radius-lg);
      }
      .pick-glass {
        width: 150px;
        height: 200px;
      }
    }
  `,
})
export class Bar {
  protected readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(MakeableStore);
  private readonly cocktailService = inject(CocktailService);

  readonly loading = this.store.loading;
  private readonly menu = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  readonly showOnboarding = computed(() => this.cabinet.isEmpty() && !this.cabinet.wizardDone());

  // ---- the day's pick ----

  private readonly day = dayIndex();
  private readonly offset = signal(0);

  /** What the pick is drawn from: the bar's drinks, or the whole menu when none is complete. */
  readonly pool = computed<Featured[]>(() => {
    const makeable = this.store.makeable();
    if (makeable.length) return makeable;
    return this.menu().map((cocktail) => ({ cocktail }));
  });
  private readonly fromBar = computed(() => this.store.makeable().length > 0);

  readonly featured = computed(() =>
    this.loading() ? null : pickOfTheDay(this.pool(), (f) => this.key(f), this.day, this.offset()),
  );

  protected readonly greeting = computed(() => this.lang.t().home.greeting(new Date().getHours()));
  protected readonly pickEyebrow = computed(() =>
    this.fromBar() ? this.lang.t().home.pickToday : this.lang.t().home.pickFromMenu,
  );
  protected readonly pickSpec = computed(() => {
    const f = this.featured()!;
    return glassSpecFor(f.cocktail, 'hero', 'ambient', f.variation?.key);
  });
  protected readonly pickTint = computed(() => {
    const f = this.featured();
    return f ? tintFor(f.cocktail) : 'var(--surface)';
  });
  protected readonly pickFamily = computed(() => {
    const fam = this.featured()?.cocktail.family;
    if (!fam) return null;
    const locale = this.lang.locale();
    return { id: fam, label: DRINK_FAMILY_LABELS[locale][fam], ratio: DRINK_FAMILY_RATIO[locale][fam] };
  });
  protected readonly pickDescription = computed(() => {
    const f = this.featured();
    return f ? (f.variation?.description ?? f.cocktail.description ?? '') : '';
  });
  protected readonly pickIngredients = computed(() => {
    const f = this.featured();
    return f ? ingredientNames(f.cocktail) : [];
  });
  protected readonly pickMeta = computed(() => {
    const c = this.featured()?.cocktail;
    if (!c) return '';
    const locale = this.lang.locale();
    const parts: string[] = [];
    if (c.glass) parts.push(GLASSWARE_LABELS[locale][c.glass]);
    if (c.method) parts.push(METHOD_LABELS[locale][c.method]);
    if (c.difficulty) parts.push(DIFFICULTY_LABELS[locale][c.difficulty]);
    return parts.join(' · ');
  });

  another(): void {
    this.offset.update((o) => o + 1);
  }

  query(f: Featured) {
    return f.variation ? { variation: f.variation.key } : null;
  }

  key(r: Featured): string {
    return resultKey(r);
  }
}
