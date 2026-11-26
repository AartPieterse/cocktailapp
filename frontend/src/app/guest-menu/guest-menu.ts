import { DOCUMENT, Location } from '@angular/common';
import {
  Component,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DRINK_FAMILY_LABELS, type DrinkFamily } from '@cocktailapp/shared';
import { combineLatest, map } from 'rxjs';
import { LanguageService } from '../core/language.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { GlassArt } from '../shared/glass-art/glass-art';
import { glassSpecFor } from '../shared/cocktail-visual';
import { ingredientNames } from '../bar/discover';
import { type MenuEntry, cleanTitle, groupByFamily, parseMenuKeys, resolveMenu } from './menu-link';

/** The theme key ThemeService writes. Read here, never written: a guest's storage stays untouched. */
const THEME_KEY = 'barkaart.theme';

/**
 * The guest's side of the guest menu: `/menu?t=…&m=…`, opened from the host's QR code.
 *
 * A top-level route OUTSIDE `Layout`, on purpose. A guest has no bar, so there is no navbar, no
 * bottom nav, no install prompt and no onboarding, and nothing here may write to the guest's
 * localStorage: this component injects neither `CabinetService` nor anything that does (the
 * Layout-only services `SyncService`, `CabinetNotice` and `StapleTopUp` never start). The only
 * shared service is `LanguageService`, so the menu speaks the guest's language.
 *
 * Tapping a drink opens the order card, a full-screen "show this to the bar". It lives in the URL
 * (`d=<key>`), so the browser's back button closes it.
 */
@Component({
  selector: 'app-guest-menu',
  imports: [MatIconModule, GlassArt],
  template: `
    <div class="menu" [inert]="!!openEntry()">
      <header class="head">
        @if (title()) {
          <p class="eyebrow">{{ g().eyebrow }}</p>
        }
        <h1>{{ title() ?? g().defaultTitle }}</h1>
        @if (loaded()) {
          <p class="count">{{ g().count(entries().length) }}</p>
        }
      </header>

      @if (!loaded()) {
        <div class="rows">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton sk-row"></div>
          }
        </div>
      } @else if (entries().length) {
        @if (alcoholFreeCount()) {
          <div class="chips" role="group" [attr.aria-label]="g().filterLabel">
            <button
              type="button"
              class="chip"
              [class.on]="alcoholFreeOnly()"
              [attr.aria-pressed]="alcoholFreeOnly()"
              (click)="alcoholFreeOnly.set(!alcoholFreeOnly())"
            >
              <mat-icon aria-hidden="true">water_drop</mat-icon>
              {{ g().alcoholFree }}
              <span class="n">{{ alcoholFreeCount() }}</span>
            </button>
          </div>
        }

        @for (s of sections(); track s.family) {
          <section class="family" [attr.aria-labelledby]="'fam-' + (s.family ?? 'other')">
            <h2 class="fam" [id]="'fam-' + (s.family ?? 'other')">{{ familyLabel(s.family) }}</h2>
            <ul class="rows">
              @for (e of s.items; track e.key) {
                <li>
                  <button type="button" class="row" (click)="open(e)">
                    <span class="glass" aria-hidden="true">
                      <app-glass-art [spec]="rowSpec(e)" />
                    </span>
                    <span class="text">
                      <span class="name">{{ e.cocktail.name }}</span>
                      @if (e.parentName) {
                        <span class="of">{{ lang.t().common.variationOf(e.parentName) }}</span>
                      }
                      <span class="ings">{{ names(e) }}</span>
                    </span>
                    @if (e.alcoholFree) {
                      <mat-icon class="af" [attr.aria-label]="g().alcoholFree" role="img"
                        >water_drop</mat-icon
                      >
                    }
                  </button>
                </li>
              }
            </ul>
          </section>
        }
      } @else {
        <div class="empty">
          <mat-icon aria-hidden="true">local_bar</mat-icon>
          <p class="empty-title">{{ g().emptyTitle }}</p>
          <p class="muted">{{ g().emptyBody }}</p>
        </div>
      }

      <footer class="foot">{{ lang.t().common.appName }}</footer>
    </div>

    @if (openEntry(); as e) {
      <div class="order" role="dialog" aria-modal="true" [attr.aria-labelledby]="'order-name'">
        <button #closeBtn type="button" class="back" (click)="close()">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          {{ g().backToMenu }}
        </button>
        <div class="order-body">
          <div class="order-glass" aria-hidden="true">
            <app-glass-art [spec]="orderSpec(e)" />
          </div>
          <h2 class="order-name" id="order-name">{{ e.cocktail.name }}</h2>
          @if (e.parentName) {
            <p class="order-of">{{ lang.t().common.variationOf(e.parentName) }}</p>
          }
          <p class="order-cta">{{ g().showToBar }}</p>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
    }
    .menu {
      max-width: 640px;
      margin: 0 auto;
      padding: 40px var(--sp-4) calc(var(--sp-6) + env(safe-area-inset-bottom));
      animation: rise 0.45s ease both;
    }
    .head {
      border-bottom: 2px solid var(--ink);
      padding-bottom: 14px;
    }
    .head h1 {
      font-size: var(--step-4);
      letter-spacing: -0.025em;
      line-height: 1.05;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .count {
      margin: 8px 0 0;
      font: 600 0.813rem var(--font-body);
      color: var(--faint);
    }

    .chips {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--hairline);
      background: var(--surface);
      color: var(--muted);
      font: 600 0.813rem var(--font-body);
      line-height: 1;
      cursor: pointer;
    }
    .chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .chip .n {
      font-weight: 500;
      opacity: 0.7;
    }
    .chip.on {
      background: var(--ok-soft);
      border-color: var(--ok);
      color: var(--ok-ink);
    }

    .family {
      margin-top: 28px;
    }
    .fam {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--dim);
      margin: 0 0 10px;
    }
    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .menu > .rows {
      margin-top: 24px;
    }
    .sk-row {
      height: 76px;
      border-radius: var(--radius);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 10px 16px 10px 10px;
      text-align: left;
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      color: var(--ink);
      font: inherit;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        transform 0.15s ease;
    }
    .row:hover {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--hairline));
    }
    .row:active {
      transform: scale(0.99);
    }
    .glass {
      flex: none;
      width: 46px;
      height: 56px;
    }
    .text {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    .name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.125rem;
      line-height: 1.2;
    }
    .of {
      font: 600 0.75rem var(--font-body);
      color: var(--faint);
    }
    .ings {
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.35;
    }
    .af {
      flex: none;
      color: var(--ok);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .empty {
      text-align: center;
      padding: 56px 0 24px;
      color: var(--muted);
    }
    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--decor);
    }
    .empty-title {
      font-family: var(--font-display);
      font-size: 1.375rem;
      font-weight: 600;
      color: var(--ink);
      margin: 12px 0 6px;
    }
    .foot {
      margin-top: 48px;
      text-align: center;
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--decor);
    }

    /* ---- the order card: the whole order is a screen held up to the bar ---- */
    .order {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      background: var(--bg-grad), var(--bg);
      color: var(--ink);
      overflow-y: auto;
      padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4)
        calc(var(--sp-6) + env(safe-area-inset-bottom));
      animation: rise 0.3s ease both;
    }
    .back {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      background: var(--surface);
      color: var(--muted);
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
    }
    .back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .order-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px 0;
    }
    .order-glass {
      width: min(62vw, 240px);
      height: min(46vh, 300px);
    }
    .order-name {
      font-size: clamp(2.25rem, 10vw, 3.75rem);
      line-height: 1.05;
      letter-spacing: -0.025em;
      margin: 20px 0 0;
      overflow-wrap: anywhere;
    }
    .order-of {
      margin: 8px 0 0;
      font: 600 0.875rem var(--font-body);
      color: var(--faint);
    }
    .order-cta {
      margin: 22px 0 0;
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
    }
    @media (prefers-reduced-motion: reduce) {
      .menu,
      .order {
        animation: none;
      }
    }
  `,
  host: { '(document:keydown.escape)': 'openEntry() && close()' },
})
export class GuestMenu {
  protected readonly lang = inject(LanguageService);
  private readonly cocktails = inject(CocktailService);
  private readonly ingredients = inject(IngredientService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  /** Query params, bound by `withComponentInputBinding`: title, menu keys, the open drink. */
  readonly t = input<string>();
  readonly m = input<string>();
  readonly d = input<string>();

  protected readonly g = computed(() => this.lang.t().guestMenu);
  protected readonly title = computed(() => cleanTitle(this.t()));

  private readonly catalog = toSignal(
    combineLatest([this.cocktails.getAll(), this.ingredients.getAll()]).pipe(
      map(([cocktails, ingredients]) => ({ cocktails, ingredients })),
    ),
  );
  protected readonly loaded = computed(() => !!this.catalog());

  readonly entries = computed<MenuEntry[]>(() => {
    const c = this.catalog();
    return c ? resolveMenu(parseMenuKeys(this.m()), c.cocktails, c.ingredients) : [];
  });
  readonly alcoholFreeOnly = signal(false);
  readonly alcoholFreeCount = computed(() => this.entries().filter((e) => e.alcoholFree).length);
  readonly sections = computed(() => {
    const list = this.alcoholFreeOnly()
      ? this.entries().filter((e) => e.alcoholFree)
      : this.entries();
    return groupByFamily(list, this.lang.locale());
  });

  readonly openEntry = computed(() => {
    const key = this.d();
    return key ? (this.entries().find((e) => e.key === key) ?? null) : null;
  });
  /** True when this page pushed the order card's history entry, so closing can simply go back. */
  private pushedOrder = false;
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  constructor() {
    this.applySavedTheme();
    // While the order card is up, the menu behind it must not scroll under the guest's thumb.
    effect((onCleanup) => {
      if (!this.openEntry()) return;
      const body = this.document.body;
      const before = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => (body.style.overflow = before));
    });
    // Move focus into the card for keyboard and screen-reader users, without a ring on a tap.
    effect(() => this.closeBtn()?.nativeElement.focus({ focusVisible: false } as FocusOptions));
  }

  familyLabel(f: DrinkFamily | null): string {
    return f ? DRINK_FAMILY_LABELS[this.lang.locale()][f] : this.g().other;
  }

  names(e: MenuEntry): string {
    return ingredientNames(e.cocktail).join(', ');
  }

  rowSpec(e: MenuEntry) {
    return glassSpecFor(e.cocktail, 'card', 'none', e.variationKey);
  }

  orderSpec(e: MenuEntry) {
    return glassSpecFor(e.cocktail, 'hero', 'pour', e.variationKey);
  }

  open(e: MenuEntry): void {
    this.pushedOrder = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { d: e.key },
      queryParamsHandling: 'merge',
    });
  }

  close(): void {
    if (this.pushedOrder) {
      this.pushedOrder = false;
      this.location.back();
      return;
    }
    // Opened straight on a card (a reload, a shared link): there is no menu entry to go back to.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { d: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * ThemeService is not started here (it persists the theme on start-up). Without it the
   * stylesheet's prefers-color-scheme fallback applies; a guest who chose a theme in Barkaart
   * before keeps it, read-only.
   */
  private applySavedTheme(): void {
    const root = this.document.documentElement;
    if (root.hasAttribute('data-theme')) return;
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
    } catch {
      /* storage unavailable: the system preference applies */
    }
  }
}
