import { Component, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  type Cocktail,
  DIFFICULTY_LABELS,
  DRINK_FAMILIES,
  DRINK_FAMILY_LABELS,
  DRINK_FAMILY_RATIO,
  type DrinkFamily,
  expandCabinet,
  GLASSWARE_LABELS,
  type Ingredient,
  isAlcoholFree,
  type MakeableResult,
  METHOD_LABELS,
} from '@cocktailapp/shared';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { CabinetService } from '../core/cabinet.service';
import { LanguageService } from '../core/language.service';
import { SubstitutesService } from '../core/substitutes.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';
import { GlassArt } from '../shared/glass-art/glass-art';
import { glassSpecFor, tintFor } from '../shared/cocktail-visual';
import { dayIndex, ingredientNames, pickOfTheDay, resultKey } from './discover';
import { LearnRow } from './learn-row/learn-row';
import { Onboarding } from './onboarding/onboarding';

/** A drink the page can feature: a makeable result, or a plain menu entry when nothing is. */
type Featured = Pick<MakeableResult, 'cocktail' | 'variation' | 'parentName'>;

/** Two rows on a wide screen, four on a phone; the rest waits behind "show all". */
const FIRST_SHOWN = 8;

/**
 * "Ontdek", the home screen. Top to bottom:
 *
 * 1. **The day's pick.** One drink from what the bar makes, set by the calendar day so it reads
 *    like a menu rather than a slot machine. "Something else" steps through the same pool.
 * 2. **What the bar makes**, filterable by family and by "alcohol-free". The count is a filter
 *    result reported in one line, never a score that climbs as the bar grows.
 * 3. **Behind the bar**: a technique, a family and a fact, none of which needs a bottle.
 *
 * What is deliberately NOT here: switches (they live on Mijn bar, next to the bar they change),
 * and anything that names a bottle to buy.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink, MatIconModule, CocktailCard, GlassArt, LearnRow, Onboarding],
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

        <!-- 2. what the bar makes -->
        <section class="make">
          <div class="section-head">
            <div>
              <h2>{{ lang.t().home.makeNow }}</h2>
              @if (!loading()) {
                <p class="fit">{{ lang.t().home.fitLine(makeableNow().length) }}</p>
              }
            </div>
          </div>

          @if (loading()) {
            <div class="grid">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="skeleton sk-card"></div>
              }
            </div>
          } @else if (makeableNow().length) {
            @if (familyChips().length > 1 || alcoholFreeCount()) {
              <div class="chips" role="group" [attr.aria-label]="lang.t().home.filterLabel">
                <button
                  type="button"
                  class="chip"
                  [class.on]="family() === null"
                  [attr.aria-pressed]="family() === null"
                  (click)="setFamily(null)"
                >
                  {{ lang.t().home.filterAll }} <span class="n">{{ afBase().length }}</span>
                </button>
                @for (c of familyChips(); track c.id) {
                  <button
                    type="button"
                    class="chip"
                    [class.on]="family() === c.id"
                    [attr.aria-pressed]="family() === c.id"
                    (click)="setFamily(c.id)"
                  >
                    {{ c.label }} <span class="n">{{ c.count }}</span>
                  </button>
                }
                @if (alcoholFreeCount()) {
                  <span class="sep" aria-hidden="true"></span>
                  <button
                    type="button"
                    class="chip af"
                    [class.on]="alcoholFreeOnly()"
                    [attr.aria-pressed]="alcoholFreeOnly()"
                    (click)="toggleAlcoholFree()"
                  >
                    <mat-icon>{{ alcoholFreeOnly() ? 'check' : 'water_drop' }}</mat-icon>
                    {{ lang.t().home.filterAlcoholFree }}
                  </button>
                }
              </div>
            }

            @if (filtered().length) {
              <div class="grid">
                @for (r of shown(); track key(r)) {
                  <app-cocktail-card
                    [cocktail]="r.cocktail"
                    [variation]="r.variation ?? null"
                    [parentName]="r.parentName ?? null"
                  />
                }
              </div>
              @if (filtered().length > firstShown) {
                <div class="more">
                  <button type="button" class="btn btn-ghost" (click)="expanded.set(!expanded())">
                    {{ expanded() ? lang.t().home.showFewer : lang.t().home.showAll(filtered().length) }}
                  </button>
                </div>
              }
            } @else {
              <p class="none">{{ lang.t().home.noneInFilter }}</p>
            }
          } @else {
            <div class="nudge">
              <span class="nudge-icon"><mat-icon>shelves</mat-icon></span>
              <div>
                <strong>{{ lang.t().home.emptyTitle }}</strong>
                <p>{{ lang.t().home.emptyBody }}</p>
                <div class="nudge-cta">
                  <a class="btn btn-primary" routerLink="/bar">{{ lang.t().home.refillBar }}</a>
                  <a class="btn btn-ghost" routerLink="/techniek">{{ lang.t().nav.technique }}</a>
                </div>
              </div>
            </div>
          }
        </section>

        <!-- 3. behind the bar -->
        <app-learn-row [makeable]="makeableCocktails()" />
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

    /* ---- what the bar makes ---- */
    .section-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 12px;
    }
    .section-head h2 {
      font-size: 1.62rem;
      margin: 0;
    }
    .fit {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: var(--step--1);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--hairline);
      background: var(--surface);
      color: var(--muted);
      font: 600 0.813rem var(--font-body);
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    }
    .chip:hover {
      border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    }
    .chip.on {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }
    .chip .n {
      font-weight: 500;
      opacity: 0.7;
    }
    .chip mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }
    .chip.af.on {
      background: var(--ok-soft);
      border-color: var(--ok);
      color: var(--ok-ink);
    }
    .sep {
      width: 1px;
      height: 20px;
      background: var(--hairline);
      margin: 0 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 22px;
      margin-top: 22px;
    }
    .sk-card {
      height: 240px;
      border-radius: var(--radius-lg);
    }
    .more {
      display: flex;
      justify-content: center;
      margin-top: 26px;
    }
    .none {
      margin: 24px 0 0;
      color: var(--muted);
    }
    .nudge {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      margin-top: 24px;
      padding: var(--sp-6);
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
    }
    .nudge-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .nudge strong {
      font-family: var(--font-display);
      font-size: 1.25rem;
    }
    .nudge p {
      margin: 6px 0 0;
      color: var(--muted);
      max-width: 52ch;
    }
    .nudge-cta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
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

    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
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
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
      .grid {
        gap: var(--sp-3);
      }
      /* One swipeable line of chips instead of three wrapped rows above the grid. */
      .chips {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-inline: calc(-1 * var(--sp-4));
        padding: 2px var(--sp-4);
        scrollbar-width: none;
      }
      .chips::-webkit-scrollbar {
        display: none;
      }
      .nudge {
        flex-direction: column;
        padding: var(--sp-5);
      }
    }
  `,
})
export class Bar {
  protected readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  private readonly subs = inject(SubstitutesService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  protected readonly firstShown = FIRST_SHOWN;

  readonly loading = signal(true);
  readonly results = signal<MakeableResult[]>([]);
  private readonly ingredients = signal<Ingredient[]>([]);
  private readonly menu = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  readonly showOnboarding = computed(() => this.cabinet.isEmpty() && !this.cabinet.wizardDone());

  readonly makeableNow = computed(() => this.results().filter((r) => r.missingCount === 0));
  /** Plain recipes only, for the learn row's examples: a variation is not a family's example. */
  readonly makeableCocktails = computed(() =>
    this.makeableNow()
      .filter((r) => !r.variation)
      .map((r) => r.cocktail),
  );

  // ---- the day's pick ----

  private readonly day = dayIndex();
  private readonly offset = signal(0);

  /** What the pick is drawn from: the bar's drinks, or the whole menu when none is complete. */
  readonly pool = computed<Featured[]>(() => {
    const makeable = this.makeableNow();
    if (makeable.length) return makeable;
    return this.menu().map((cocktail) => ({ cocktail }));
  });
  private readonly fromBar = computed(() => this.makeableNow().length > 0);

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

  // ---- filters ----

  // Kept in the URL, so coming back from a recipe restores the chips and the "show all" you left.
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly initial = this.route.snapshot.queryParamMap;

  readonly family = signal<DrinkFamily | null>(
    DRINK_FAMILIES.find((f) => f === this.initial.get('familie')) ?? null,
  );
  readonly alcoholFreeOnly = signal(this.initial.get('alcoholvrij') === '1');
  readonly expanded = signal(this.initial.get('alle') === '1');

  private readonly alcoholFreeKeys = computed(() => {
    const ingredients = this.ingredients();
    return new Set(
      this.makeableNow()
        .filter((r) => isAlcoholFree(r.cocktail, ingredients))
        .map((r) => this.key(r)),
    );
  });
  readonly alcoholFreeCount = computed(() => this.alcoholFreeKeys().size);

  /** The makeable set after the alcohol-free switch; the family chips count within it. */
  readonly afBase = computed(() => {
    const list = this.makeableNow();
    if (!this.alcoholFreeOnly()) return list;
    const af = this.alcoholFreeKeys();
    return list.filter((r) => af.has(this.key(r)));
  });

  readonly familyChips = computed(() => {
    const counts = new Map<DrinkFamily, number>();
    for (const r of this.afBase()) {
      const f = r.cocktail.family;
      if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const labels = DRINK_FAMILY_LABELS[this.lang.locale()];
    const selected = this.family();
    return DRINK_FAMILIES.filter((f) => counts.has(f) || f === selected).map((f) => ({
      id: f,
      label: labels[f],
      count: counts.get(f) ?? 0,
    }));
  });

  readonly filtered = computed(() => {
    const fam = this.family();
    const base = this.afBase();
    return fam ? base.filter((r) => r.cocktail.family === fam) : base;
  });

  readonly shown = computed(() =>
    this.expanded() ? this.filtered() : this.filtered().slice(0, FIRST_SHOWN),
  );

  setFamily(f: DrinkFamily | null): void {
    this.family.set(this.family() === f ? null : f);
    this.expanded.set(false);
  }

  toggleAlcoholFree(): void {
    this.alcoholFreeOnly.update((v) => !v);
    this.expanded.set(false);
  }

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    // Same as the cocktail list: replaceState keeps the router's navigationId in the history
    // entry, which back/forward scroll restoration depends on.
    effect(() => {
      const queryParams = {
        familie: this.family(),
        alcoholvrij: this.alcoholFreeOnly() ? '1' : null,
        alle: this.expanded() ? '1' : null,
      };
      const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams }).toString();
      if (url !== this.location.path()) this.location.replaceState(url, '', this.location.getState());
    });

    combineLatest([
      toObservable(this.cabinet.ids),
      toObservable(this.subs.enabled),
      toObservable(this.ingredients),
    ])
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(([ids, substitutes, ingredients]) => {
          if (!ids.length) return of<MakeableResult[]>([]);
          const query = expandCabinet(ids, ingredients, { substitutes });
          return this.cocktailService.makeable(query, 0).pipe(catchError(() => of<MakeableResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.results.set(res);
        this.loading.set(false);
      });
  }

  query(f: Featured) {
    return f.variation ? { variation: f.variation.key } : null;
  }

  key(r: Featured): string {
    return resultKey(r);
  }
}
