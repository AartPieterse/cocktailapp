import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { expandCabinet, type Cocktail, type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import {
  catchError,
  combineLatest,
  debounceTime,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { CabinetService } from '../../core/cabinet.service';
import { FavoritesService } from '../../core/favorites.service';
import { SubstitutesService } from '../../core/substitutes.service';
import { CocktailService } from '../../services/cocktail.service';
import { IngredientService } from '../../services/ingredient.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CocktailCard } from '../cocktail-card/cocktail-card';
import { environment } from '../../../environments/environment';

interface Status {
  count: number;
  names: string[];
}

@Component({
  selector: 'app-cocktail-list',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatIconModule, CocktailCard],
  template: `
    <div class="page">
      <header class="head">
        <h1>Alle cocktails</h1>
        <div class="tools">
          <input
            class="search"
            [formControl]="searchCtrl"
            placeholder="Zoek op naam…"
            autocomplete="off"
          />
          <button
            class="fav-toggle"
            type="button"
            [class.on]="onlyFavs()"
            (click)="onlyFavs.update((v) => !v)"
            aria-label="Alleen favorieten"
          >
            <mat-icon>{{ onlyFavs() ? 'favorite' : 'favorite_border' }}</mat-icon>
          </button>
          @if (admin) {
            <a mat-flat-button routerLink="/cocktails/add"><mat-icon>add</mat-icon> Nieuw</a>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="grid">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="skeleton sk-card"></div>
          }
        </div>
      } @else if (visible().length) {
        <div class="grid">
          @for (c of visible(); track c.id) {
            <app-cocktail-card
              [cocktail]="c"
              [showStatus]="true"
              [missingCount]="statusFor(c).count"
              [missingNames]="statusFor(c).names"
            >
              @if (admin) {
                <a mat-button [routerLink]="['/cocktails', c.id, 'edit']">Bewerk</a>
                <button mat-button (click)="remove(c)">Verwijder</button>
              }
            </app-cocktail-card>
          }
        </div>
      } @else {
        <div class="empty">
          <mat-icon>search_off</mat-icon>
          <h3>Niets gevonden</h3>
          <p class="muted">
            @if (onlyFavs()) {
              Je hebt nog geen favorieten. Tik op het hartje van een cocktail.
            } @else {
              Pas je zoekopdracht aan.
            }
          </p>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      padding-top: 44px;
      animation: rise 0.45s ease both;
    }
    .head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 30px;
    }
    .head h1 {
      font-size: var(--step-4);
      letter-spacing: -0.025em;
      margin: 0;
    }
    .tools {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }
    .search {
      width: 280px;
      max-width: 60vw;
      padding: 13px 16px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      font: 500 0.875rem var(--font-body);
      background: var(--surface);
      color: var(--ink);
      outline: none;
    }
    .search:focus {
      border-color: var(--accent);
    }
    .fav-toggle {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--muted);
      cursor: pointer;
    }
    .fav-toggle.on {
      color: var(--accent);
      border-color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 22px;
    }
    .sk-card {
      height: 230px;
      border-radius: var(--radius-lg);
    }
    .empty {
      text-align: center;
      padding: var(--sp-8) var(--sp-4);
      color: var(--muted);
    }
    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--faint);
    }
    @media (max-width: 980px) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CocktailList {
  private readonly cocktailService = inject(CocktailService);
  private readonly favorites = inject(FavoritesService);
  private readonly cabinet = inject(CabinetService);
  private readonly subs = inject(SubstitutesService);
  private readonly ingredientService = inject(IngredientService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly admin = environment.admin;

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly onlyFavs = signal(false);
  readonly loading = signal(true);
  readonly cocktails = signal<Cocktail[]>([]);
  private readonly ingredients = signal<Ingredient[]>([]);
  private readonly status = signal<Map<string, Status>>(new Map());
  private readonly reload = signal(0);

  readonly visible = computed(() => {
    const list = this.cocktails();
    return this.onlyFavs() ? list.filter((c) => this.favorites.has(c.id)) : list;
  });

  private readonly query = toSignal(
    this.searchCtrl.valueChanges.pipe(debounceTime(250), startWith(this.searchCtrl.value)),
    { initialValue: '' },
  );

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    // Cocktail list (with name search).
    combineLatest([toObservable(this.query), toObservable(this.reload)])
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(([q]) =>
          this.cocktailService.getAll(q || undefined).pipe(catchError(() => of<Cocktail[]>([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.cocktails.set(list);
        this.loading.set(false);
      });

    // Availability status per cocktail, recomputed whenever the cabinet changes.
    combineLatest([
      toObservable(this.cabinet.ids),
      toObservable(this.subs.enabled),
      toObservable(this.ingredients),
    ])
      .pipe(
        switchMap(([ids, substitutes, ingredients]) => {
          if (!ids.length) return of<MakeableResult[]>([]);
          const query = expandCabinet(ids, ingredients, { substitutes });
          return this.cocktailService.makeable(query, 99).pipe(catchError(() => of<MakeableResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        const map = new Map<string, Status>();
        for (const r of res) map.set(r.cocktail.id, { count: r.missingCount, names: r.missing.map((m) => m.name) });
        this.status.set(map);
      });
  }

  statusFor(c: Cocktail): Status {
    return this.status().get(c.id) ?? { count: c.ingredients.length ? 99 : 0, names: [] };
  }

  remove(cocktail: Cocktail): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Cocktail "${cocktail.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(cocktail.id).subscribe(() => {
        this.snackBar.open('Cocktail verwijderd', 'OK', { duration: 2500 });
        this.reload.update((v) => v + 1);
      });
    });
  }
}
