import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS_PLURAL,
  computeMakeable,
  expandCabinet,
  type Cocktail,
  type Ingredient,
} from '@cocktailapp/shared';
import { AnalyticsService } from '../../core/analytics.service';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { SubstitutesService } from '../../core/substitutes.service';
import { CocktailService } from '../../services/cocktail.service';
import { IngredientService } from '../../services/ingredient.service';
import { IngredientGlyph } from '../../shared/ingredient-glyph/ingredient-glyph';
import { buildWizardSteps, searchChips, visibleChips, type WizardStep } from './wizard-steps';

/** Chips shown per step before "toon alles" — enough to cover the drinks people actually make. */
const CHIP_LIMIT = 8;

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
          <div
            class="track"
            role="progressbar"
            aria-valuemin="1"
            [attr.aria-valuenow]="current() + 1"
            [attr.aria-valuemax]="steps().length"
            [attr.aria-label]="lang.t().wizard.progressLabel"
          >
            <div class="fill" [style.width]="pct()"></div>
          </div>
          <input
            class="search"
            type="search"
            autocomplete="off"
            [value]="query()"
            [placeholder]="lang.t().wizard.searchPlaceholder"
            [attr.aria-label]="lang.t().wizard.searchPlaceholder"
            (input)="onSearch($event)"
          />
        </div>

        <div class="card-body">
          <h1 #stepHeading tabindex="-1">{{ heading() }}</h1>
          @if (!searching()) {
            <p class="hint">{{ step()?.hint }}</p>
          }
          <div class="chips">
            @for (chip of chips(); track chip.ingredient.id) {
              <button
                type="button"
                class="chip"
                [class.on]="selection().has(chip.ingredient.id)"
                (click)="toggle(chip.ingredient.id)"
                [attr.aria-pressed]="selection().has(chip.ingredient.id)"
              >
                <span class="glyph"
                  ><app-ingredient-glyph
                    [ingId]="chip.ingredient.id"
                    [cat]="chip.ingredient.category"
                /></span>
                {{ chip.ingredient.name }}
              </button>
            } @empty {
              <p class="muted">
                {{ searching() ? lang.t().wizard.searchEmpty : lang.t().wizard.emptyCategory }}
              </p>
            }
          </div>
          @if (!searching() && (expanded() || hidden() > 0)) {
            <button class="more" type="button" (click)="expanded.set(!expanded())">
              {{ expanded() ? lang.t().wizard.showLess : lang.t().wizard.showAll(hidden()) }}
            </button>
          }
        </div>

        <div class="card-foot">
          <p class="payoff" aria-live="polite">{{ payoff() }}</p>
          <div class="actions">
            @if (current() > 0) {
              <button class="btn btn-back" type="button" (click)="prev()">
                {{ lang.t().wizard.back }}
              </button>
            }
            <button class="btn btn-next" type="button" (click)="next()">
              {{ isLast() ? lang.t().wizard.finish : lang.t().wizard.next }}
            </button>
          </div>
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
      /* Deliberately NOT overflow:hidden — that would make the card a scroll container and the
         sticky footer below would pin to the card instead of the viewport. */
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
    /* An escape hatch, not the main event: the step's question has to stay the loudest thing here. */
    .search {
      width: 100%;
      margin-top: 14px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--hairline-soft);
      background: none;
      color: inherit;
      font: 500 0.813rem var(--font-body);
    }
    .search::placeholder {
      color: var(--dim);
    }
    .search:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .card-body {
      padding: 20px 32px 8px;
    }
    .card-body h1 {
      font-size: 2rem;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .card-body h1:focus-visible {
      outline: none;
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
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
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
    .more {
      margin-top: 16px;
      background: none;
      border: none;
      padding: 0;
      font: 600 0.813rem var(--font-body);
      color: var(--accent);
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    /* Pinned to the bottom of the viewport while a long step scrolls, so the live count and the
       "next" button are reachable without scrolling past 26 chips on a phone. */
    .card-foot {
      position: sticky;
      bottom: 0;
      padding: 16px 32px 22px;
      margin-top: 16px;
      border-top: 1px solid var(--hairline-soft);
      background: var(--surface);
      border-radius: 0 0 26px 26px;
    }
    .payoff {
      margin: 0 0 12px;
      font: 600 0.875rem var(--font-body);
      color: var(--muted);
      min-height: 1.2em;
    }
    .actions {
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
    /* The app's own fixed tab bar owns the bottom of a phone screen; the footer parks above it
       rather than under it, and the card gets room to end above it too. */
    @media (max-width: 780px) {
      .card-foot {
        bottom: calc(60px + env(safe-area-inset-bottom));
      }
      .stage {
        padding-bottom: calc(72px + env(safe-area-inset-bottom));
      }
    }
    @media (max-width: 640px) {
      .stage {
        padding-top: 16px;
      }
      .card {
        border-radius: 20px;
      }
      .card-top {
        padding: 18px 18px 4px;
      }
      .card-body {
        padding: 16px 18px 8px;
      }
      .card-body h1 {
        font-size: 1.5rem;
      }
      .card-foot {
        padding: 12px 18px calc(16px + env(safe-area-inset-bottom));
        border-radius: 0 0 20px 20px;
      }
    }
  `,
})
export class Wizard {
  private readonly cabinet = inject(CabinetService);
  protected readonly lang = inject(LanguageService);
  private readonly subs = inject(SubstitutesService);
  private readonly ingredientService = inject(IngredientService);
  private readonly cocktailService = inject(CocktailService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);

  private readonly ingredients = signal<Ingredient[]>([]);
  private readonly cocktails = signal<Cocktail[]>([]);
  readonly selection = signal<Set<string>>(new Set());
  readonly query = signal('');
  readonly expanded = signal(false);

  private readonly headingEl = viewChild<ElementRef<HTMLHeadingElement>>('stepHeading');

  /**
   * The step lives in the URL (`/bar/wizard/3`), not in a signal, so the browser's back button —
   * the one an Android user reaches for first — walks back a step instead of leaving the wizard
   * and dropping every tick made so far.
   */
  private readonly routeStep = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('step')) || 1)),
    { initialValue: 1 },
  );
  readonly current = computed(() => {
    const n = this.steps().length;
    if (!n) return 0;
    return Math.min(Math.max(this.routeStep() - 1, 0), n - 1);
  });

  /** The cabinet as it was when this run started — the baseline for "what did the user add". */
  private cabinetAtStart = new Set<string>();
  /** Ids ticked for the user (the pantry staples), so they are not reported as user choices. */
  private preChecked = new Set<string>();
  /** Ids the user actually clicked during this run. */
  private readonly touched = new Set<string>();
  private readonly stepsSeen = new Set<number>();
  private committed = false;

  readonly steps = computed<WizardStep[]>(() => {
    const locale = this.lang.locale();
    const t = this.lang.t().wizard;
    return buildWizardSteps({
      ingredients: this.ingredients(),
      cocktails: this.cocktails(),
      selection: this.selection(),
      labels: CATEGORY_LABELS_PLURAL[locale],
      hints: CATEGORY_HINTS[locale],
      staplesTitle: t.staplesTitle,
      staplesHint: t.staplesHint,
      spiritsTitle: t.spiritsTitle,
      spiritsHint: t.spiritsHint,
    });
  });

  readonly step = computed<WizardStep | undefined>(() => this.steps()[this.current()]);
  readonly isLast = computed(() => this.current() >= this.steps().length - 1);
  readonly pct = computed(() => {
    const n = this.steps().length || 1;
    return Math.round(((this.current() + 1) / n) * 100) + '%';
  });

  readonly searching = computed(() => this.query().trim().length > 0);
  readonly chips = computed(() => {
    if (this.searching()) return searchChips(this.steps(), this.query());
    const step = this.step();
    return step ? visibleChips(step, this.selection(), this.expanded(), CHIP_LIMIT) : [];
  });
  readonly hidden = computed(() => {
    const step = this.step();
    if (!step || this.searching()) return 0;
    return Math.max(step.allChips.length - this.chips().length, 0);
  });
  readonly heading = computed(() =>
    this.searching() ? this.lang.t().wizard.searchResults : (this.step()?.title ?? ''),
  );

  /** The live payoff: what the ticks so far already buy, in the app's own hero terms. */
  private readonly available = computed(() =>
    expandCabinet([...this.selection()], this.ingredients(), {
      substitutes: this.subs.enabled(),
    }),
  );
  readonly makeableCount = computed(
    () => computeMakeable(this.cocktails(), this.available(), 0).length,
  );
  readonly almostCount = computed(
    () => computeMakeable(this.cocktails(), this.available(), 1).length - this.makeableCount(),
  );
  readonly payoff = computed(() => {
    const t = this.lang.t().wizard;
    if (this.makeableCount() > 0) return t.makeable(this.makeableCount());
    if (this.almostCount() > 0) return t.almost(this.almostCount());
    return t.nothingYet;
  });

  constructor() {
    this.analytics.track('wizard_start');

    this.cocktailService.getAll().subscribe((list) => this.cocktails.set(list));

    this.ingredientService.getAll().subscribe((list) => {
      this.ingredients.set(list);
      this.cabinetAtStart = new Set(this.cabinet.ids());
      const init = new Set(this.cabinetAtStart);
      // First run: pre-check the pantry staples so building a bar is fast. This ticks every staple,
      // including the ones the wizard no longer asks about (ice, salt, the spices) — they cannot
      // change what you can make, but a recipe page should still show them as in your bar.
      if (!this.cabinet.wizardDone()) {
        for (const ing of list)
          if (ing.isStaple) {
            if (!init.has(ing.id)) this.preChecked.add(ing.id);
            init.add(ing.id);
          }
      }
      // Resume an interrupted run, but only when the cabinet is still what it was when the draft
      // was written — otherwise a stale draft would quietly undo edits made in Mijn bar since.
      const draft = readDraft();
      this.selection.set(
        draft && sameIds(draft.base, [...this.cabinetAtStart]) ? new Set(draft.ids) : init,
      );
    });

    // Persist every tick, so a reload or an accidental navigation mid-wizard costs nothing.
    effect(() => {
      if (this.committed || !this.ingredients().length) return;
      writeDraft({ base: [...this.cabinetAtStart].sort(), ids: [...this.selection()].sort() });
    });

    // A new step is a new question: collapse the disclosure, drop a stale search, move focus to
    // the heading (nothing else announces the change to a screen reader) and start from the top.
    let previous = -1;
    effect(() => {
      const i = this.current();
      if (!this.steps().length || i === previous) return;
      const first = previous === -1;
      previous = i;
      this.expanded.set(false);
      this.query.set('');
      if (!first) {
        this.headingEl()?.nativeElement.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // One event the first time each step is shown: the totals give the drop-off curve.
      if (!this.stepsSeen.has(i)) {
        this.stepsSeen.add(i);
        this.analytics.track(`wizard_step_${i + 1}` as const);
      }
    });
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  toggle(id: string): void {
    this.touched.add(id);
    const next = new Set(this.selection());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selection.set(next);
  }

  next(): void {
    if (this.isLast()) this.finish();
    else void this.router.navigate(['/bar/wizard', this.current() + 2]);
  }
  prev(): void {
    if (this.current() > 0) void this.router.navigate(['/bar/wizard', this.current()]);
  }

  finish(): void {
    // A catalog that never loaded leaves an empty selection; committing it would wipe a cabinet
    // the user never opened this screen to clear.
    if (!this.ingredients().length) return this.leave();

    const added = [...this.selection()].filter((id) => !this.cabinetAtStart.has(id));
    this.cabinet.setAll(this.selection());
    this.cabinet.completeWizard();
    // `setAll` is deliberately silent (sync adopts server state through it too), so the wizard —
    // the route most ingredients are actually added on — reports its own adds. Staples ticked for
    // the user and never touched are not user choices and stay out of the tally.
    for (const id of added) {
      if (this.touched.has(id) || !this.preChecked.has(id)) {
        this.analytics.track('cabinet_add', { ingredientId: id });
      }
    }
    this.analytics.track('wizard_complete');
    this.leave();
  }

  quit(): void {
    // Skipping is a decision, not a detour: remember it, or the discover page greets the user with
    // the very "build your bar" screen they just dismissed.
    this.cabinet.completeWizard();
    this.analytics.track('wizard_skip');
    this.leave();
  }

  private leave(): void {
    this.committed = true;
    clearDraft();
    void this.router.navigate(['/ontdek']);
  }
}

const DRAFT_KEY = 'barkast.wizardDraft';

/** An interrupted wizard run: what was ticked, and the cabinet it started from. */
interface WizardDraft {
  base: string[];
  ids: string[];
}

function readDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    if (!Array.isArray(parsed.ids) || !Array.isArray(parsed.base)) return null;
    return { base: parsed.base, ids: parsed.ids };
  } catch {
    return null;
  }
}

function writeDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — the wizard still works, it just cannot resume */
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}
