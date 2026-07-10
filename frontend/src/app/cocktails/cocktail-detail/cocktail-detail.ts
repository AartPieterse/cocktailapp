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
import { CocktailThumb } from '../../shared/cocktail-thumb/cocktail-thumb';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cocktail-detail',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, CocktailThumb],
  template: `
    @if (loading()) {
      <div class="detail">
        <div class="skeleton" style="aspect-ratio:16/10;border-radius:var(--radius-lg)"></div>
        <div class="skeleton sk" style="width:60%;height:34px;margin-top:24px"></div>
        <div class="skeleton sk" style="width:90%;height:16px"></div>
      </div>
    } @else if (cocktail(); as c) {
      <a class="back no-print" routerLink="/cocktails"><mat-icon>arrow_back</mat-icon> Alle cocktails</a>

      <article class="detail">
        <div class="hero">
          <div class="hero-media">
            <app-cocktail-thumb [name]="c.name" [imageUrl]="c.imageUrl" />
          </div>
          <div class="hero-copy">
            <p class="eyebrow">{{ tags(c)[0] || 'Cocktail' }}</p>
            <h1>{{ c.name }}</h1>
            <p class="lede">{{ c.description }}</p>

            <div class="meta">
              @if (c.method) {
                <div class="meta-item"><span class="k">Methode</span><span>{{ methodLabel(c) }}</span></div>
              }
              @if (c.glass) {
                <div class="meta-item"><span class="k">Glas</span><span>{{ glassLabel(c) }}</span></div>
              }
              @if (c.difficulty) {
                <div class="meta-item"><span class="k">Niveau</span><span>{{ diffLabel(c) }}</span></div>
              }
            </div>

            <div class="hero-actions no-print">
              <button
                mat-flat-button
                (click)="toggleFav(c)"
                [class.faved]="isFav(c)"
              >
                <mat-icon>{{ isFav(c) ? 'favorite' : 'favorite_border' }}</mat-icon>
                {{ isFav(c) ? 'Favoriet' : 'Bewaar' }}
              </button>
              <button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print</button>
              @if (admin) {
                <a mat-stroked-button [routerLink]="['/cocktails', c.id, 'edit']">
                  <mat-icon>edit</mat-icon> Bewerk
                </a>
                <button mat-icon-button (click)="remove(c)" aria-label="Verwijder" matTooltip="Verwijder">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <div class="cols">
          <section class="ingredients">
            <div class="col-head">
              <h2>Ingrediënten</h2>
              <div class="servings no-print">
                <button mat-icon-button (click)="stepServings(-1)" [disabled]="servings() <= 1" aria-label="Minder">
                  <mat-icon>remove</mat-icon>
                </button>
                <span>{{ servings() }} {{ servings() === 1 ? 'glas' : 'glazen' }}</span>
                <button mat-icon-button (click)="stepServings(1)" aria-label="Meer">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </div>

            <ul class="lines">
              @for (i of c.ingredients; track i.ingredientId + i.name) {
                <li [class.have]="inBar(i)">
                  <span class="tick" [attr.aria-label]="inBar(i) ? 'In je bar' : 'Niet in je bar'">
                    <mat-icon>{{ inBar(i) ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  </span>
                  <span class="amount">{{ scaled(i) }} {{ unitLabel(i) }}</span>
                  <span class="ing">
                    {{ i.call ?? i.name }}
                    @if (i.call && i.call !== i.name) { <span class="base">({{ i.name }})</span> }
                    @if (i.optional) { <em class="opt">optioneel</em> }
                    @if (i.note) { <span class="note">— {{ i.note }}</span> }
                  </span>
                </li>
              } @empty {
                <li class="muted">Geen ingrediënten opgegeven.</li>
              }
            </ul>

            @if (c.garnish) {
              <p class="garnish"><mat-icon>eco</mat-icon> Garnering: {{ c.garnish }}</p>
            }
          </section>

          <section class="method">
            <h2>Bereiding</h2>
            @if (c.instructions.length) {
              <ol class="steps">
                @for (step of c.instructions; track $index) {
                  <li><span class="n">{{ $index + 1 }}</span><span>{{ step }}</span></li>
                }
              </ol>
            } @else {
              <p class="muted">Geen instructies opgegeven.</p>
            }

            @if (tags(c).length) {
              <div class="tag-row no-print">
                @for (t of tags(c); track t) {
                  <a class="pill" routerLink="/cocktails" [queryParams]="{ tag: t }">#{{ t }}</a>
                }
              </div>
            }
          </section>
        </div>
      </article>
    } @else {
      <div class="notfound">
        <p class="eyebrow">404</p>
        <h1>Deze cocktail bestaat niet (meer)</h1>
        <a mat-flat-button routerLink="/cocktails">Terug naar de collectie</a>
      </div>
    }
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--muted);
      margin-bottom: var(--sp-4);
      font-size: var(--step--1);
    }
    .back:hover {
      color: var(--accent);
    }
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-6);
      align-items: center;
    }
    .hero-media {
      border-radius: var(--radius-lg);
      overflow: hidden;
      --thumb-ratio: 4 / 3;
      border: 1px solid var(--hairline);
    }
    .hero-copy h1 {
      font-size: var(--step-5);
      margin: 0 0 var(--sp-3);
    }
    .meta {
      display: flex;
      gap: var(--sp-5);
      flex-wrap: wrap;
      margin: var(--sp-4) 0;
      padding: var(--sp-3) 0;
      border-top: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-item .k {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--faint);
    }
    .meta-item span:last-child {
      font-weight: 600;
    }
    .hero-actions {
      display: flex;
      gap: var(--sp-2);
      flex-wrap: wrap;
      margin-top: var(--sp-4);
    }
    .hero-actions .faved {
      --mat-sys-primary: var(--accent);
    }
    .cols {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: var(--sp-7);
      margin-top: var(--sp-7);
    }
    .col-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--sp-3);
      margin-bottom: var(--sp-3);
    }
    .col-head h2 {
      margin: 0;
    }
    .servings {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      padding: 2px 6px;
      font-size: var(--step--1);
      font-weight: 600;
      white-space: nowrap;
    }
    .lines {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .lines li {
      display: grid;
      grid-template-columns: 24px auto 1fr;
      gap: var(--sp-2);
      align-items: baseline;
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--hairline);
    }
    .tick mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--faint);
      transform: translateY(3px);
    }
    .lines li.have .tick mat-icon {
      color: var(--ok);
    }
    .amount {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      white-space: nowrap;
    }
    .ing .opt {
      color: var(--faint);
      font-size: var(--step--1);
      margin-left: 4px;
    }
    .ing .base {
      color: var(--muted);
      font-size: var(--step--1);
      margin-left: 4px;
    }
    .ing .note {
      color: var(--muted);
    }
    .garnish {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: var(--sp-4);
      color: var(--muted);
      font-size: var(--step--1);
    }
    .garnish mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--ok);
    }
    .steps {
      list-style: none;
      counter-reset: step;
      padding: 0;
      margin: 0;
    }
    .steps li {
      display: flex;
      gap: var(--sp-3);
      margin-bottom: var(--sp-4);
      line-height: 1.5;
    }
    .steps .n {
      flex: none;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-family: var(--font-display);
      font-weight: 600;
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin-top: var(--sp-5);
    }
    .tag-row .pill:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .notfound {
      text-align: center;
      padding: var(--sp-8) 0;
    }
    @media (max-width: 760px) {
      .hero,
      .cols {
        grid-template-columns: 1fr;
        gap: var(--sp-5);
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

  constructor() {
    toObservable(this.id)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((id) =>
          this.cocktailService.getOne(id).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((c) => {
        this.cocktail.set(c);
        this.servings.set(c?.servings ?? 1);
        this.loading.set(false);
      });
  }

  tags(c: Cocktail): string[] {
    return c.tags ?? [];
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

  inBar(i: CocktailIngredient): boolean {
    return this.cabinet.has(i.ingredientId);
  }

  isFav(c: Cocktail): boolean {
    return this.favorites.has(c.id);
  }
  toggleFav(c: Cocktail): void {
    this.favorites.toggle(c.id);
  }

  /** Amount rescaled to the chosen number of servings, trimmed of trailing zeros. */
  scaled(i: CocktailIngredient): string {
    if (i.amount === undefined) return ''; // top-up / decorative lines carry no number
    const base = this.cocktail()?.servings ?? 1;
    const factor = this.servings() / base;
    const fmt = (n: number) =>
      Number((n * factor).toFixed(2)).toString().replace('.', ',');
    // Authored ranges ("6–8 blaadjes") keep both bounds.
    return i.amountMax !== undefined
      ? `${fmt(i.amount)}–${fmt(i.amountMax)}`
      : fmt(i.amount);
  }

  stepServings(delta: number): void {
    this.servings.update((v) => Math.max(1, Math.min(20, v + delta)));
  }

  print(): void {
    window.print();
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
