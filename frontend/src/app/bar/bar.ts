import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { expandCabinet, type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { AnalyticsService } from '../core/analytics.service';
import { CabinetService } from '../core/cabinet.service';
import { LanguageService } from '../core/language.service';
import { SubstitutesService } from '../core/substitutes.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';
import { FactCard } from './fact-card/fact-card';
import { GlassArt } from '../shared/glass-art/glass-art';
import { glassSpecFor } from '../shared/cocktail-visual';

@Component({
  selector: 'app-bar',
  imports: [RouterLink, MatIconModule, MatSlideToggleModule, CocktailCard, FactCard, GlassArt],
  template: `
    @if (showOnboarding()) {
      <section class="onboard">
        <p class="eyebrow">{{ lang.t().home.welcome }}</p>
        <h1 class="hero-title" [innerHTML]="lang.t().home.heroTitle"></h1>
        <p class="lede" [innerHTML]="lang.t().home.heroLede"></p>
        <div class="cta">
          <a class="btn btn-primary" routerLink="/bar/wizard">{{ lang.t().home.buildBar }}</a>
          <a class="btn btn-ghost" routerLink="/cocktails">{{ lang.t().home.browseFirst }}</a>
        </div>
      </section>
    } @else {
      <div class="fade">
        <!-- hero -->
        <div class="hero">
          <div class="hero-copy">
            <p class="eyebrow">{{ lang.t().home.eyebrow }}</p>
            <h1 class="count">
              {{ lang.t().home.countPre }} <span class="big">{{ displayCount() }}</span><br />
              {{ lang.t().home.countPost(displayCount()) }}
            </h1>
            <p class="lede">
              {{ lang.t().home.makeableLede(makeableNow().length, almost1().length) }}
            </p>
            <div class="cta">
              <a class="btn btn-primary" routerLink="/bar">{{ lang.t().home.editBar }}</a>
              <a class="btn btn-ghost" routerLink="/bar/wizard">{{ lang.t().home.wizardAgain }}</a>
            </div>
          </div>
          <div class="hero-glasses">
            @for (r of heroGlasses(); track r.cocktail.id; let i = $index) {
              <a
                class="floaty"
                [style.animation-delay]="i * 0.7 + 's'"
                [routerLink]="['/cocktails', r.cocktail.id]"
                [attr.aria-label]="r.cocktail.name"
              >
                <app-glass-art [spec]="spec(r)" />
              </a>
            }
          </div>
        </div>

        <!-- content row -->
        <div class="row">
          <div class="main">
            <div class="section-head">
              <h2>{{ lang.t().home.makeNow }}</h2>
              <span class="count-pill">{{ lang.t().home.cocktailsCount(makeableNow().length) }}</span>
            </div>
            @if (loading()) {
              <div class="grid">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                  <div class="skeleton sk-card"></div>
                }
              </div>
            } @else if (makeableNow().length) {
              <div class="grid">
                @for (r of makeableNow(); track r.cocktail.id) {
                  <app-cocktail-card [cocktail]="r.cocktail" [missingCount]="0" />
                }
              </div>
            } @else {
              <div class="nudge">
                <strong>{{ lang.t().home.emptyTitle }}</strong>
                <p class="muted">{{ lang.t().home.emptyBody }}</p>
                <a class="btn btn-ghost" routerLink="/bar">{{ lang.t().home.refillBar }}</a>
              </div>
            }
          </div>

          <aside class="side">
            @if (almost1().length) {
              <div class="card side-card">
                <div class="side-eyebrow">{{ lang.t().home.almostHeader }}</div>
                <div class="almost">
                  @for (r of almost1(); track r.cocktail.id) {
                    <div class="almost-row">
                      <a class="almost-name" [routerLink]="['/cocktails', r.cocktail.id]">
                        {{ r.cocktail.name }}
                      </a>
                      <button class="add-chip" (click)="addMissing(r)">
                        + {{ missName(r) }}
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
            <app-fact-card />
            <div class="card night">
              <div class="side-eyebrow dim">{{ lang.t().home.yourBar }}</div>
              <div class="cab-count">
                {{ cabinet.count() }} <span>{{ lang.t().common.ingredientsWord }}</span>
              </div>
              <label class="subs">
                <mat-slide-toggle
                  [checked]="subs.enabled()"
                  (change)="subs.toggle($event.checked)"
                >
                  {{ lang.t().home.countSubstitutes }}
                </mat-slide-toggle>
              </label>
              @if (analytics.available) {
                <label class="subs">
                  <mat-slide-toggle
                    [checked]="!analytics.optedOut()"
                    (change)="analytics.setOptOut(!$event.checked)"
                  >
                    Anonieme statistieken delen
                  </mat-slide-toggle>
                </label>
              }
              <a class="btn night-btn" routerLink="/bar">{{ lang.t().home.editBarShort }}</a>
            </div>
          </aside>
        </div>
      </div>
    }
  `,
  styles: `
    .fade {
      animation: rise 0.5s ease both;
    }
    /* onboarding */
    .onboard {
      max-width: 640px;
      margin: var(--sp-6) 0 var(--sp-8);
      animation: rise 0.5s ease both;
    }
    .hero-title {
      font-size: var(--step-5);
      margin: 0 0 var(--sp-4);
    }
    .eyebrow {
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.2em;
      color: var(--dim);
      text-transform: uppercase;
      margin: 0;
    }
    /* hero */
    .hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 40px;
      align-items: center;
      padding: 56px 0 40px;
    }
    .count {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(3rem, 7vw, 4.75rem);
      line-height: 0.98;
      letter-spacing: -0.035em;
      margin: 14px 0 0;
    }
    .count .big {
      color: var(--accent);
    }
    .hero-copy .lede {
      margin-top: 22px;
      max-width: 440px;
      color: var(--muted);
    }
    .cta {
      display: flex;
      gap: 12px;
      margin-top: 28px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-pill);
      padding: 13px 24px;
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
      border: 1.5px solid transparent;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .btn:hover {
      transform: translateY(-1px);
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-ghost {
      background: none;
      border-color: color-mix(in srgb, var(--ink) 20%, transparent);
      color: var(--muted);
    }
    .hero-glasses {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: clamp(4px, 2vw, 12px);
      width: 100%;
    }
    .floaty {
      display: block;
      flex: 0 1 150px;
      min-width: 0;
      aspect-ratio: 3 / 4;
      animation: floaty 5s ease-in-out infinite;
    }
    /* content row */
    .row {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 40px;
      align-items: start;
      margin-top: 16px;
    }
    .section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 12px;
    }
    .section-head h2 {
      font-size: 1.62rem;
      margin: 0;
    }
    .count-pill {
      font: 600 0.813rem var(--font-body);
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-top: 24px;
    }
    .sk-card {
      height: 240px;
      border-radius: var(--radius-lg);
    }
    .nudge {
      margin-top: 24px;
      padding: var(--sp-5);
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
    }
    .nudge p {
      margin: 6px 0 var(--sp-4);
    }
    /* sidebar */
    .side {
      position: sticky;
      top: 98px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 20px;
    }
    .side-eyebrow {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      color: var(--dim);
      text-transform: uppercase;
    }
    .almost {
      margin-top: 8px;
    }
    .almost-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--hairline-soft);
    }
    .almost-row:last-child {
      border-bottom: none;
    }
    .almost-name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1rem;
      min-width: 0;
      cursor: pointer;
    }
    .almost-name:hover {
      color: var(--accent);
    }
    .add-chip {
      background: var(--accent-soft);
      border: 1.5px solid var(--accent);
      color: var(--accent);
      border-radius: var(--radius-pill);
      padding: 7px 12px;
      font: 600 0.75rem var(--font-body);
      cursor: pointer;
      white-space: nowrap;
      flex: none;
    }
    .night {
      background: var(--night);
      color: var(--night-ink);
      border: none;
    }
    .night .dim {
      color: var(--night-faint);
    }
    .cab-count {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 2.1rem;
      margin-top: 8px;
    }
    .cab-count span {
      font-size: 1rem;
      font-family: var(--font-body);
      font-weight: 500;
      color: var(--night-faint);
    }
    .subs {
      display: block;
      margin: 14px 0 4px;
      --mdc-switch-selected-track-color: var(--accent);
      --mdc-switch-selected-handle-color: #fff;
      font-size: var(--step--1);
    }
    .night-btn {
      margin-top: 14px;
      width: 100%;
      background: rgba(244, 235, 216, 0.1);
      color: var(--night-ink);
      border: 1px solid rgba(244, 235, 216, 0.2);
      border-radius: 12px;
      padding: 11px;
      font: 600 0.813rem var(--font-body);
    }
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding: 32px 0 24px;
      }
      .hero-glasses {
        max-width: 420px;
        margin: 0 auto;
      }
      .row {
        grid-template-columns: 1fr;
      }
      .side {
        position: static;
      }
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 520px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Bar {
  protected readonly cabinet = inject(CabinetService);
  protected readonly subs = inject(SubstitutesService);
  protected readonly lang = inject(LanguageService);
  protected readonly analytics = inject(AnalyticsService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  readonly loading = signal(false);
  readonly results = signal<MakeableResult[]>([]);
  private readonly ingredients = signal<Ingredient[]>([]);

  readonly showOnboarding = computed(() => this.cabinet.isEmpty() && !this.cabinet.wizardDone());

  readonly makeableNow = computed(() => this.results().filter((r) => r.missingCount === 0));
  readonly almost1 = computed(() => this.results().filter((r) => r.missingCount === 1));
  /** Eased, animated mirror of makeableNow().length so the hero number counts up when the cabinet changes. */
  readonly displayCount = signal(0);
  readonly heroGlasses = computed(() => this.makeableNow().slice(0, 3));

  private countRaf = 0;

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

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
          return this.cocktailService.makeable(query, 2).pipe(catchError(() => of<MakeableResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.results.set(res);
        this.loading.set(false);
      });

    // Tween the hero count toward the live makeable total whenever it changes.
    effect(() => {
      const target = this.makeableNow().length;
      untracked(() => this.animateCount(target));
    });
  }

  private animateCount(target: number): void {
    const start = untracked(this.displayCount);
    if (start === target) return;
    cancelAnimationFrame(this.countRaf);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.displayCount.set(target);
      return;
    }
    const t0 = performance.now();
    const dur = 450;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      this.displayCount.set(Math.round(start + (target - start) * eased));
      if (p < 1) this.countRaf = requestAnimationFrame(step);
    };
    this.countRaf = requestAnimationFrame(step);
  }

  spec(r: MakeableResult) {
    return glassSpecFor(r.cocktail);
  }

  missName(r: MakeableResult): string {
    return r.missing[0]?.name ?? '';
  }

  addMissing(r: MakeableResult): void {
    for (const m of r.missing) this.cabinet.toggle(m.ingredientId, true);
  }
}
