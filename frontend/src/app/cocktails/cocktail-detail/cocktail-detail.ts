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
  DIFFICULTY_LABELS,
  GLASSWARE_LABELS,
  MEASURE_LABELS,
  METHOD_LABELS,
} from '@cocktailapp/shared';
import { catchError, of, switchMap, tap } from 'rxjs';
import { CabinetService } from '../../core/cabinet.service';
import { FavoritesService } from '../../core/favorites.service';
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
        <button class="back no-print" (click)="back()">‹ Terug</button>
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
              <div class="garnish">Garnering · {{ c.garnish }}</div>
            }
            <div class="mini-actions no-print">
              <button class="mini" [class.on]="isFav(c)" (click)="toggleFav(c)">
                <mat-icon>{{ isFav(c) ? 'favorite' : 'favorite_border' }}</mat-icon>
                {{ isFav(c) ? 'Favoriet' : 'Bewaar' }}
              </button>
              <button class="mini" (click)="print()"><mat-icon>print</mat-icon> Print</button>
              @if (admin) {
                <a class="mini" [routerLink]="['/cocktails', c.id, 'edit']"><mat-icon>edit</mat-icon> Bewerk</a>
                <button class="mini" (click)="remove(c)"><mat-icon>delete_outline</mat-icon></button>
              }
            </div>
          </div>

          <div class="detail">
            <h1>{{ c.name }}</h1>
            @if (c.description) { <p class="lede">{{ c.description }}</p> }

            @if (makeable()) {
              <div class="banner ok">✓ Je hebt alles in huis — shaken maar!</div>
            } @else {
              <div class="banner miss">
                <span>Je mist nog {{ missingNames() }}</span>
                <button class="add-btn" (click)="addAllMissing()">+ Toevoegen aan kast</button>
              </div>
            }

            <div class="sec-label">Ingrediënten</div>
            <div class="lines">
              <div class="servings no-print">
                <button (click)="stepServings(-1)" [disabled]="servings() <= 1" aria-label="Minder">–</button>
                <span>{{ servings() }} {{ servings() === 1 ? 'glas' : 'glazen' }}</span>
                <button (click)="stepServings(1)" aria-label="Meer">+</button>
              </div>
              @for (i of c.ingredients; track i.ingredientId + i.name) {
                <div class="line">
                  <span class="glyph"><app-ingredient-glyph [ingId]="i.ingredientId" [cat]="ingCat(i)" /></span>
                  <div class="meas">{{ scaled(i) }} {{ unitLabel(i) }}</div>
                  <div class="iname">
                    {{ i.call ?? i.name }}
                    @if (i.optional) { <em class="opt">optioneel</em> }
                    @if (i.note) { <span class="note">· {{ i.note }}</span> }
                  </div>
                  @if (inBar(i)) {
                    <span class="in-kast">✓ in kast</span>
                  } @else if (!i.optional) {
                    <button class="add-line no-print" (click)="add(i)">+ toevoegen</button>
                  }
                </div>
              }
            </div>

            <div class="sec-label">Bereiding</div>
            <div class="steps">
              @for (step of c.instructions; track $index) {
                <div class="step">
                  <div class="n">{{ $index + 1 }}</div>
                  <div class="t">{{ step }}</div>
                </div>
              } @empty {
                <p class="muted">Geen instructies opgegeven.</p>
              }
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="notfound">
        <p class="eyebrow">404</p>
        <h1>Deze cocktail bestaat niet (meer)</h1>
        <a class="add-btn" routerLink="/cocktails">Terug naar de collectie</a>
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
    .servings {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin: 4px 0 8px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      padding: 4px 10px;
      font: 600 0.813rem var(--font-body);
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
  `,
})
export class CocktailDetail {
  readonly id = input.required<string>();

  private readonly cocktailService = inject(CocktailService);
  private readonly cabinet = inject(CabinetService);
  private readonly favorites = inject(FavoritesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly admin = environment.admin;

  readonly cocktail = signal<Cocktail | null>(null);
  readonly loading = signal(true);
  readonly servings = signal(1);

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
    return c.method ? METHOD_LABELS[c.method] : '';
  }
  glassLabel(c: Cocktail): string {
    return c.glass ? GLASSWARE_LABELS[c.glass] : '';
  }
  diffLabel(c: Cocktail): string {
    return c.difficulty ? DIFFICULTY_LABELS[c.difficulty] : '';
  }
  unitLabel(i: CocktailIngredient): string {
    return MEASURE_LABELS[i.unit];
  }
  ingCat(i: CocktailIngredient): string | undefined {
    return i.role === 'garnish' ? 'garnish' : undefined;
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
    const fmt = (n: number): string => Number((n * factor).toFixed(2)).toString().replace('.', ',');
    return i.amountMax !== undefined ? `${fmt(i.amount)}–${fmt(i.amountMax)}` : fmt(i.amount);
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
      data: { message: `Cocktail "${c.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(c.id).subscribe(() => {
        this.snackBar.open('Cocktail verwijderd', 'OK', { duration: 2500 });
        void this.router.navigate(['/cocktails']);
      });
    });
  }
}
