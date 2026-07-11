import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  type Cocktail,
  type CocktailIngredient,
  type VolumeUnit,
  convertMeasure,
  DIFFICULTY_LABELS,
  GLASSWARE_LABELS,
  isVolumeUnit,
  MEASURE_LABELS,
  METHOD_LABELS,
} from '@cocktailapp/shared';
import { catchError, of, switchMap, tap } from 'rxjs';
import { CabinetService } from '../../core/cabinet.service';
import { LanguageService } from '../../core/language.service';
import { FavoritesService } from '../../core/favorites.service';
import { UnitPreferenceService } from '../../core/unit-preference.service';
import { IngredientService } from '../../services/ingredient.service';
import { CocktailService } from '../../services/cocktail.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { GlassArt } from '../../shared/glass-art/glass-art';
import { IngredientGlyph } from '../../shared/ingredient-glyph/ingredient-glyph';
import { glassSpecFor, tintFor } from '../../shared/cocktail-visual';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cocktail-detail',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, GlassArt, IngredientGlyph],
  template: `
    @if (loading()) {
      <div class="wrap">
        <div class="skeleton" style="aspect-ratio:1/1.1;border-radius:28px"></div>
        <div>
          <div class="skeleton" style="width:60%;height:44px;margin-bottom:16px"></div>
          <div class="skeleton" style="width:90%;height:16px"></div>
        </div>
      </div>
    } @else if (cocktail(); as c) {
      <div class="page">
        <button class="back no-print" (click)="back()">{{ lang.t().detail.back }}</button>
        <div class="wrap">
          <div class="visual">
            <div class="panel" [style.background]="tint()">
              <div class="glass"><app-glass-art [spec]="spec()" /></div>
            </div>
            <div class="pills">
              @if (c.glass) { <span class="pill">{{ glassLabel(c) }}</span> }
              @if (c.method) { <span class="pill">{{ methodLabel(c) }}</span> }
              @if (c.difficulty) { <span class="pill">{{ diffLabel(c) }}</span> }
            </div>
            @if (c.garnish) {
              <div class="garnish">{{ lang.t().detail.garnishPrefix }} · {{ c.garnish }}</div>
            }
            <div class="mini-actions no-print">
              <button class="mini" [class.on]="isFav(c)" (click)="toggleFav(c)">
                <mat-icon>{{ isFav(c) ? 'favorite' : 'favorite_border' }}</mat-icon>
                {{ isFav(c) ? lang.t().detail.favorite : lang.t().detail.saveFavorite }}
              </button>
              <button class="mini" (click)="print()"><mat-icon>print</mat-icon> {{ lang.t().detail.print }}</button>
              @if (admin) {
                <a class="mini" [routerLink]="['/cocktails', c.id, 'edit']"><mat-icon>edit</mat-icon> {{ lang.t().detail.edit }}</a>
                <button class="mini" (click)="remove(c)"><mat-icon>delete_outline</mat-icon></button>
              }
            </div>
          </div>

          <div class="detail">
            <h1>{{ c.name }}</h1>
            @if (c.description) { <p class="lede">{{ c.description }}</p> }

            @if (makeable()) {
              <div class="banner ok">{{ lang.t().detail.haveAll }}</div>
            } @else {
              <div class="banner miss">
                <span>{{ lang.t().detail.youStillMiss(missingNames()) }}</span>
                <button class="add-btn" (click)="addAllMissing()">{{ lang.t().detail.addToBar }}</button>
              </div>
            }

            <div class="sec-label">{{ lang.t().detail.ingredients }}</div>
            <div class="lines">
              <div class="controls no-print">
                <div class="servings">
                  <button (click)="stepServings(-1)" [disabled]="servings() <= 1" [attr.aria-label]="lang.t().detail.less">–</button>
                  <span>{{ lang.t().detail.glasses(servings()) }}</span>
                  <button (click)="stepServings(1)" [attr.aria-label]="lang.t().detail.more">+</button>
                </div>
                @if (hasVolume()) {
                  <div class="unit-toggle" role="group" [attr.aria-label]="lang.t().form.unit">
                    @for (u of unitOptions; track u) {
                      <button
                        [class.on]="unit() === u"
                        [attr.aria-pressed]="unit() === u"
                        (click)="setUnit(u)"
                      >
                        {{ u }}
                      </button>
                    }
                  </div>
                }
              </div>
              @for (i of c.ingredients; track i.ingredientId + i.name) {
                <div class="line">
                  <span class="glyph"><app-ingredient-glyph [ingId]="i.ingredientId" [cat]="ingCat(i)" /></span>
                  <div class="meas">{{ scaled(i) }} {{ unitLabel(i) }}</div>
                  <div class="iname">
                    {{ i.call ?? i.name }}
                    @if (i.optional) { <em class="opt">{{ lang.t().detail.optional }}</em> }
                    @if (i.note) { <span class="note">· {{ i.note }}</span> }
                  </div>
                  @if (inBar(i)) {
                    <span class="in-kast">{{ lang.t().detail.inBar }}</span>
                  } @else if (!i.optional) {
                    <button class="add-line no-print" (click)="add(i)">{{ lang.t().detail.add }}</button>
                  }
                </div>
              }
            </div>

            <div class="sec-label">{{ lang.t().detail.preparation }}</div>
            <div class="steps">
              @for (step of c.instructions; track $index) {
                <div class="step">
                  <div class="n">{{ $index + 1 }}</div>
                  <div class="t">{{ step }}</div>
                </div>
              } @empty {
                <p class="muted">{{ lang.t().detail.noInstructions }}</p>
              }
            </div>

            @if (c.notes) {
              <div class="sec-label">{{ lang.t().detail.tips }}</div>
              <p class="notes">{{ c.notes }}</p>
            }

            @if (c.variations?.length) {
              <div class="sec-label">{{ lang.t().detail.variations }}</div>
              <div class="variations">
                @for (v of c.variations; track v.name) {
                  <div class="variation">
                    <div class="v-head">
                      <span class="v-name">{{ v.name }}</span>
                      @if (v.makesCocktailId) {
                        <a class="v-link" [routerLink]="['/cocktails', v.makesCocktailId]">{{ lang.t().detail.viewRecipe }}</a>
                      }
                    </div>
                    @if (v.swaps?.length) {
                      <div class="v-swaps">
                        @for (s of v.swaps; track s.fromId + s.toId) {
                          <span class="swap">
                            <span class="from">{{ ingName(s.fromId) }}</span>
                            <mat-icon>arrow_forward</mat-icon>
                            <span class="to">{{ ingName(s.toId) }}</span>
                          </span>
                        }
                      </div>
                    }
                    @if (v.description) { <p class="v-desc">{{ v.description }}</p> }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="notfound">
        <p class="eyebrow">404</p>
        <h1>{{ lang.t().detail.notFoundTitle }}</h1>
        <a class="add-btn" routerLink="/cocktails">{{ lang.t().detail.backToCollection }}</a>
      </div>
    }
  `,
  styles: `
    .page {
      padding-top: 28px;
      animation: rise 0.45s ease both;
    }
    .back {
      background: none;
      border: none;
      font: 600 0.875rem var(--font-body);
      color: var(--muted);
      cursor: pointer;
      padding: 6px 0;
    }
    .back:hover {
      color: var(--accent);
    }
    .wrap {
      display: grid;
      grid-template-columns: 0.9fr 1.1fr;
      gap: 56px;
      align-items: start;
      margin-top: 12px;
    }
    .visual {
      position: sticky;
      top: 98px;
    }
    .panel {
      border-radius: 28px;
      padding: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .glass {
      height: 340px;
      width: 270px;
      animation: floaty 5.5s ease-in-out infinite;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }
    .pill {
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      padding: 8px 14px;
      font: 600 0.781rem var(--font-body);
      color: var(--muted);
    }
    .garnish {
      margin-top: 14px;
      background: var(--surface-2);
      border-radius: 14px;
      padding: 14px 16px;
      font: 500 0.813rem var(--font-body);
      color: var(--muted);
    }
    .mini-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .mini {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      padding: 8px 14px;
      font: 600 0.781rem var(--font-body);
      color: var(--muted);
      cursor: pointer;
    }
    .mini:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .mini.on {
      color: var(--accent);
      border-color: var(--accent);
    }
    .mini mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }
    .detail h1 {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(2.6rem, 5vw, 3.25rem);
      line-height: 1;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .detail .lede {
      color: var(--muted);
      margin-top: 16px;
      max-width: 520px;
      font-size: 1rem;
    }
    .banner {
      margin-top: 22px;
      border-radius: 14px;
      font: 600 0.875rem var(--font-body);
    }
    .banner.ok {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--ok-soft);
      color: var(--ok-ink);
      padding: 14px 20px;
    }
    .banner.miss {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      background: var(--warn-soft);
      padding: 12px 12px 12px 20px;
      color: var(--warn);
    }
    .add-btn {
      background: var(--accent);
      border: none;
      color: #fff;
      border-radius: 11px;
      padding: 11px 16px;
      font: 600 0.813rem var(--font-body);
      cursor: pointer;
      white-space: nowrap;
      flex: none;
    }
    .sec-label {
      margin-top: 36px;
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.16em;
      color: var(--dim);
      text-transform: uppercase;
    }
    .lines {
      margin-top: 8px;
      max-width: 520px;
    }
    .controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin: 4px 0 8px;
    }
    .servings {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      padding: 4px 10px;
      font: 600 0.813rem var(--font-body);
    }
    .unit-toggle {
      display: inline-flex;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .unit-toggle button {
      border: none;
      background: none;
      color: var(--muted);
      font: 600 0.813rem var(--font-body);
      padding: 6px 13px;
      cursor: pointer;
      line-height: 1.4;
    }
    .unit-toggle button.on {
      background: var(--accent);
      color: #fff;
    }
    .notes {
      margin-top: 12px;
      max-width: 520px;
      font: 500 0.938rem/1.6 var(--font-body);
      color: var(--muted);
      background: var(--surface-2);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .variations {
      margin-top: 12px;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .variation {
      border: 1px solid var(--hairline);
      border-radius: 14px;
      padding: 14px 16px;
    }
    .v-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .v-name {
      font: 600 1rem var(--font-body);
      color: var(--ink);
    }
    .v-link {
      font: 600 0.813rem var(--font-body);
      color: var(--accent);
      white-space: nowrap;
    }
    .v-link:hover {
      text-decoration: underline;
    }
    .v-swaps {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .swap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface-2);
      border-radius: var(--radius-pill);
      padding: 5px 12px;
      font: 600 0.781rem var(--font-body);
      color: var(--muted);
    }
    .swap .to {
      color: var(--accent);
    }
    .swap mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--faint);
    }
    .v-desc {
      margin: 8px 0 0;
      font: 500 0.906rem/1.55 var(--font-body);
      color: var(--muted);
    }
    .servings button {
      border: none;
      background: none;
      color: var(--accent);
      font-size: 1.1rem;
      cursor: pointer;
      line-height: 1;
    }
    .servings button:disabled {
      color: var(--faint);
      cursor: default;
    }
    .line {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 11px 0;
      border-bottom: 1px solid var(--hairline-soft);
    }
    .line .glyph {
      width: 34px;
      height: 34px;
      flex: none;
      display: block;
    }
    .meas {
      width: 74px;
      flex: none;
      font: 600 0.844rem var(--font-body);
      color: var(--faint);
    }
    .iname {
      flex: 1;
      font: 500 1rem var(--font-body);
    }
    .iname .opt {
      color: var(--faint);
      font-size: var(--step--1);
      margin-left: 4px;
    }
    .iname .note {
      color: var(--muted);
    }
    .in-kast {
      font: 700 0.875rem var(--font-body);
      color: var(--ok);
      white-space: nowrap;
    }
    .add-line {
      background: var(--warn-soft);
      border: none;
      border-radius: 10px;
      padding: 8px 12px;
      font: 600 0.781rem var(--font-body);
      color: var(--warn);
      cursor: pointer;
      white-space: nowrap;
    }
    .steps {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 520px;
    }
    .step {
      display: flex;
      gap: 18px;
      align-items: flex-start;
    }
    .step .n {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.62rem;
      color: var(--accent);
      line-height: 1;
      width: 30px;
      flex: none;
    }
    .step .t {
      font: 500 1rem/1.55 var(--font-body);
      color: var(--ink);
    }
    .notfound {
      text-align: center;
      padding: var(--sp-8) 0;
    }
    @media (max-width: 860px) {
      .wrap {
        grid-template-columns: 1fr;
        gap: 28px;
      }
      .visual {
        position: static;
      }
      .glass {
        height: 260px;
      }
    }
    @media (max-width: 520px) {
      /* Let the "je mist nog…" banner + its button stack instead of overflowing. */
      .banner.miss {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .banner.miss .add-btn {
        width: 100%;
      }
      .meas {
        width: 62px;
      }
    }
  `,
})
export class CocktailDetail {
  readonly id = input.required<string>();

  private readonly cocktailService = inject(CocktailService);
  private readonly cabinet = inject(CabinetService);
  private readonly favorites = inject(FavoritesService);
  private readonly unitPref = inject(UnitPreferenceService);
  private readonly ingredientService = inject(IngredientService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  protected readonly lang = inject(LanguageService);

  protected readonly admin = environment.admin;

  readonly cocktail = signal<Cocktail | null>(null);
  readonly loading = signal(true);
  readonly servings = signal(1);

  /** Base id → display name, so variation swaps read in the display language (translated catalog). */
  private readonly ingredientNames = signal<Map<string, string>>(new Map());

  protected readonly unitOptions = this.unitPref.options;
  readonly unit = this.unitPref.unit;

  /** Whether the recipe has any volume line worth offering a ml/cl/oz toggle for. */
  readonly hasVolume = computed(() => (this.cocktail()?.ingredients ?? []).some((i) => isVolumeUnit(i.unit)));

  readonly spec = computed(() => {
    const c = this.cocktail();
    return c ? glassSpecFor(c) : { glass: 'coupe' as const };
  });
  readonly tint = computed(() => {
    const c = this.cocktail();
    return c ? tintFor(c) : 'var(--surface-2)';
  });

  /** Required, non-optional, non-garnish lines the user still misses. */
  private readonly missingLines = computed(() => {
    const c = this.cocktail();
    if (!c) return [];
    return c.ingredients.filter(
      (i) => !i.optional && i.role !== 'garnish' && i.role !== 'seasoning' && !this.cabinet.has(i.ingredientId),
    );
  });
  readonly makeable = computed(() => this.missingLines().length === 0);
  readonly missingNames = computed(() =>
    this.missingLines()
      .map((i) => i.call ?? i.name)
      .join(', '),
  );

  constructor() {
    this.ingredientService
      .getAll()
      .subscribe((list) => this.ingredientNames.set(new Map(list.map((i) => [i.id, i.name]))));

    toObservable(this.id)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((id) => this.cocktailService.getOne(id).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((c) => {
        this.cocktail.set(c);
        this.servings.set(c?.servings ?? 1);
        this.loading.set(false);
      });
  }

  methodLabel(c: Cocktail): string {
    return c.method ? METHOD_LABELS[this.lang.locale()][c.method] : '';
  }
  glassLabel(c: Cocktail): string {
    return c.glass ? GLASSWARE_LABELS[this.lang.locale()][c.glass] : '';
  }
  diffLabel(c: Cocktail): string {
    return c.difficulty ? DIFFICULTY_LABELS[this.lang.locale()][c.difficulty] : '';
  }
  unitLabel(i: CocktailIngredient): string {
    const unit = isVolumeUnit(i.unit) ? this.unit() : i.unit;
    return MEASURE_LABELS[this.lang.locale()][unit];
  }
  setUnit(u: VolumeUnit): void {
    this.unitPref.set(u);
  }
  ingCat(i: CocktailIngredient): string | undefined {
    return i.role === 'garnish' ? 'garnish' : undefined;
  }
  ingName(id: string): string {
    return this.ingredientNames().get(id) ?? id;
  }

  inBar(i: CocktailIngredient): boolean {
    return this.cabinet.has(i.ingredientId);
  }
  add(i: CocktailIngredient): void {
    this.cabinet.toggle(i.ingredientId, true);
  }
  addAllMissing(): void {
    for (const i of this.missingLines()) this.cabinet.toggle(i.ingredientId, true);
  }

  isFav(c: Cocktail): boolean {
    return this.favorites.has(c.id);
  }
  toggleFav(c: Cocktail): void {
    this.favorites.toggle(c.id);
  }

  scaled(i: CocktailIngredient): string {
    if (i.amount === undefined) return '';
    const base = this.cocktail()?.servings ?? 1;
    const factor = this.servings() / base;
    const target = this.unit();
    const conv = (n: number): number => convertMeasure(n * factor, i.unit, target).amount;
    const fmt = (n: number): string => Number(n.toFixed(2)).toString().replace('.', ',');
    return i.amountMax !== undefined
      ? `${fmt(conv(i.amount))}–${fmt(conv(i.amountMax))}`
      : fmt(conv(i.amount));
  }

  stepServings(delta: number): void {
    this.servings.update((v) => Math.max(1, Math.min(20, v + delta)));
  }

  print(): void {
    window.print();
  }

  back(): void {
    void this.router.navigate(['/cocktails']);
  }

  remove(c: Cocktail): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: this.lang.t().detail.confirmDelete(c.name) },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(c.id).subscribe(() => {
        this.snackBar.open(this.lang.t().detail.deleted, this.lang.t().common.ok, { duration: 2500 });
        void this.router.navigate(['/cocktails']);
      });
    });
  }
}
