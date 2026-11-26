import { Location } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  DRINK_FAMILIES,
  DRINK_FAMILY_LABELS,
  type DrinkFamily,
  isAlcoholFree,
  type MakeableResult,
} from '@cocktailapp/shared';
import { AnalyticsService } from '../../core/analytics.service';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { MakeableStore } from '../../core/makeable.store';
import { CocktailCard, viaName } from '../../cocktails/cocktail-card/cocktail-card';
import { resultKey } from '../discover';

/** Two rows on a wide screen, four on a phone; the rest waits behind "show all". */
const FIRST_SHOWN = 8;

/**
 * "Mijn bar": what your bar is, and what it makes.
 *
 * The count, the drinks you can make right now (filterable by family and alcohol-free), and the
 * bar's settings. A card whose drink leans on a substitute says so in a quiet line ("met jenever"),
 * since substitutes always count and the card shows no status of its own here. Ticking what you
 * have lives one step further, on `/bar/ingredienten`, so the list that changes is never pushed out
 * of view by the checklist.
 *
 * This list used to sit on Ontdek, under the day's pick. It moved here because it is the answer to
 * what you ticked, not something to discover.
 */
@Component({
  selector: 'app-my-bar',
  imports: [RouterLink, MatIconModule, MatSlideToggleModule, CocktailCard],
  template: `
    <div class="page">
      <header class="head">
        <div class="title-row">
          <h1>{{ lang.t().bar.title }}</h1>
          <a class="edit-btn" routerLink="/bar/ingredienten">
            <mat-icon aria-hidden="true">edit</mat-icon>
            {{ lang.t().bar.editIngredients }}
          </a>
          <!-- The guest menu is a list of what the bar makes, so it only appears once there is one. -->
          @if (makeable().length) {
            <a class="edit-btn" routerLink="/bar/gastenmenu">
              <mat-icon aria-hidden="true">qr_code_2</mat-icon>
              {{ lang.t().guestMenu.open }}
            </a>
          }
        </div>
        <div class="tally">
          <div class="makeable">{{ lang.t().bar.youCanMake(makeable().length) }}</div>
          <div class="selected">{{ lang.t().bar.selected(cabinet.count()) }}</div>
        </div>
      </header>

      @if (store.loading()) {
        <div class="grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton sk-card"></div>
          }
        </div>
      } @else if (makeable().length) {
        @if (familyChips().length > 1 || alcoholFreeCount()) {
          <div class="chips" role="group" [attr.aria-label]="lang.t().bar.filterLabel">
            <button
              type="button"
              class="chip"
              [class.on]="family() === null"
              [attr.aria-pressed]="family() === null"
              (click)="setFamily(null)"
            >
              {{ lang.t().bar.filterAll }} <span class="n">{{ afBase().length }}</span>
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
                {{ lang.t().bar.filterAlcoholFree }}
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
                [via]="via(r)"
              />
            }
          </div>
          @if (filtered().length > firstShown) {
            <div class="more">
              <button type="button" class="btn btn-ghost" (click)="expanded.set(!expanded())">
                {{ expanded() ? lang.t().bar.showFewer : lang.t().bar.showAll(filtered().length) }}
              </button>
            </div>
          }
        } @else {
          <p class="none">{{ lang.t().bar.noneInFilter }}</p>
        }
      } @else {
        <div class="nudge">
          <span class="nudge-icon"><mat-icon>shelves</mat-icon></span>
          <div>
            <strong>{{ lang.t().bar.emptyTitle }}</strong>
            <p>{{ lang.t().bar.emptyBody }}</p>
            <div class="nudge-cta">
              <a class="btn btn-primary" routerLink="/bar/ingredienten">{{ lang.t().bar.editIngredients }}</a>
              <a class="btn btn-ghost" routerLink="/bar/wizard">{{ lang.t().bar.startWizard }}</a>
            </div>
          </div>
        </div>
      }

      @if (analytics.available) {
        <section class="settings" [attr.aria-label]="lang.t().bar.settingsTitle">
          <div class="group-label">{{ lang.t().bar.settingsTitle }}</div>
          <div class="setting">
            <mat-slide-toggle
              [checked]="!analytics.optedOut()"
              (change)="analytics.setOptOut(!$event.checked)"
            >
              {{ lang.t().bar.shareStats }}
            </mat-slide-toggle>
            <p class="hint">{{ lang.t().bar.shareStatsHint }}</p>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .page {
      padding-top: 44px;
      padding-bottom: 24px;
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
    .title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 16px;
    }
    /* The same outlined pill as the wizard button on the ingredients page. */
    .edit-btn {
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
    .edit-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .edit-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
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

    /* ---- the list ---- */
    .chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 22px;
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

    /* ---- settings ---- */
    .settings {
      display: grid;
      gap: 14px;
      margin: 48px 0 8px;
      padding-top: 20px;
      border-top: 1px solid var(--hairline);
      max-width: 640px;
    }
    .group-label {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      color: var(--dim);
      text-transform: uppercase;
    }
    .setting {
      --mdc-switch-selected-track-color: var(--accent);
      --mdc-switch-selected-handle-color: #fff;
    }
    .hint {
      margin: 4px 0 0 52px;
      font-size: var(--step--1);
      color: var(--muted);
      max-width: 52ch;
    }

    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 760px) {
      /* On a phone the tally drops under the title, so it lines up with the title, not the edge. */
      .tally {
        text-align: left;
      }
    }
    @media (max-width: 520px) {
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
export class MyBar {
  protected readonly store = inject(MakeableStore);
  protected readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  protected readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly firstShown = FIRST_SHOWN;
  protected readonly makeable = this.store.makeable;

  // Kept in the URL, so coming back from a recipe restores the chips and the "show all" you left.
  private readonly initial = this.route.snapshot.queryParamMap;
  readonly family = signal<DrinkFamily | null>(
    DRINK_FAMILIES.find((f) => f === this.initial.get('familie')) ?? null,
  );
  readonly alcoholFreeOnly = signal(this.initial.get('alcoholvrij') === '1');
  readonly expanded = signal(this.initial.get('alle') === '1');

  private readonly alcoholFreeKeys = computed(() => {
    const ingredients = this.store.ingredients();
    return new Set(
      this.makeable()
        .filter((r) => isAlcoholFree(r.cocktail, ingredients))
        .map((r) => this.key(r)),
    );
  });
  readonly alcoholFreeCount = computed(() => this.alcoholFreeKeys().size);

  /** The makeable set after the alcohol-free switch; the family chips count within it. */
  readonly afBase = computed(() => {
    const list = this.makeable();
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

  constructor() {
    // replaceState, not a navigation: filtering adds no history steps, and the router's
    // navigationId in the entry (which back/forward scroll restoration needs) is kept.
    effect(() => {
      const queryParams = {
        familie: this.family(),
        alcoholvrij: this.alcoholFreeOnly() ? '1' : null,
        alle: this.expanded() ? '1' : null,
      };
      const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams }).toString();
      if (url !== this.location.path()) this.location.replaceState(url, '', this.location.getState());
    });
  }

  setFamily(f: DrinkFamily | null): void {
    this.family.set(this.family() === f ? null : f);
    this.expanded.set(false);
  }

  toggleAlcoholFree(): void {
    this.alcoholFreeOnly.update((v) => !v);
    this.expanded.set(false);
  }

  key(r: Pick<MakeableResult, 'cocktail' | 'variation'>): string {
    return resultKey(r);
  }

  via(r: MakeableResult): string | null {
    return viaName(r);
  }
}
