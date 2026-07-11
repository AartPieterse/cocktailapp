import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ALCOHOLIC_INGREDIENT_CATEGORIES,
  BASE_SPIRITS,
  BASE_SPIRIT_LABELS,
  DIFFICULTIES,
  expandCabinet,
  type BaseSpirit,
  type Cocktail,
  type Ingredient,
  type MakeableResult,
} from '@cocktailapp/shared';
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

type SortKey = 'name-asc' | 'name-desc' | 'difficulty';

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
            placeholder="Zoek op naam of ingrediënt…"
            aria-label="Zoek cocktails op naam of ingrediënt"
            autocomplete="off"
          />
          <button
            class="fav-toggle"
            type="button"
            [class.on]="onlyFavs()"
            [attr.aria-pressed]="onlyFavs()"
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

      <div class="filters">
        <div class="chips" role="group" aria-label="Filter op basissterk">
          @for (s of spiritOptions; track s) {
            <button
              class="chip"
              type="button"
              [class.on]="spirit() === s"
              [attr.aria-pressed]="spirit() === s"
              (click)="toggleSpirit(s)"
            >
              {{ spiritLabel(s) }}
            </button>
          }
          <button
            class="chip"
            type="button"
            [class.on]="alcoholFreeOnly()"
            [attr.aria-pressed]="alcoholFreeOnly()"
            (click)="alcoholFreeOnly.update((v) => !v)"
          >
            Alcoholvrij
          </button>
        </div>
        <div class="sortbox">
          <label class="sr-only" for="sort-select">Sorteer op</label>
          <select
            id="sort-select"
            class="sort"
            [value]="sort()"
            (change)="onSort($event)"
          >
            <option value="name-asc">Naam A–Z</option>
            <option value="name-desc">Naam Z–A</option>
            <option value="difficulty">Moeilijkheid</option>
          </select>
          @if (hasActiveFilters()) {
            <button class="clear" type="button" (click)="clearFilters()">Wis filters</button>
          }
        </div>
      </div>

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
            } @else if (alcoholFreeOnly()) {
              Nog geen alcoholvrije recepten in de collectie.
            } @else {
              Pas je zoekopdracht of filters aan.
            }
          </p>
          @if (hasActiveFilters()) {
            <button class="clear" type="button" (click)="clearFilters()">Wis filters</button>
          }
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
      margin-bottom: 20px;
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
    .filters {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 30px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      border: 1px solid var(--hairline);
      border-radius: var(--radius-pill);
      background: var(--surface);
      color: var(--muted);
      padding: 8px 15px;
      font: 600 0.813rem var(--font-body);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .chip:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .chip.on {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .sortbox {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sort {
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      padding: 10px 14px;
      font: 600 0.813rem var(--font-body);
      cursor: pointer;
    }
    .sort:focus {
      outline: none;
      border-color: var(--accent);
    }
    .clear {
      border: none;
      background: none;
      color: var(--accent);
      font: 600 0.813rem var(--font-body);
      cursor: pointer;
      padding: 8px 4px;
    }
    .clear:hover {
      text-decoration: underline;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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

  /** Base spirits shown as filter chips (all but the empty `none` bucket). */
  protected readonly spiritOptions = BASE_SPIRITS.filter((s) => s !== 'none');

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly onlyFavs = signal(false);
  readonly spirit = signal<BaseSpirit | null>(null);
  readonly alcoholFreeOnly = signal(false);
  readonly sort = signal<SortKey>('name-asc');
  readonly loading = signal(true);
  readonly cocktails = signal<Cocktail[]>([]);
  private readonly ingredients = signal<Ingredient[]>([]);
  private readonly status = signal<Map<string, Status>>(new Map());
  private readonly reload = signal(0);

  /** Ids of ingredients that carry alcohol — drives the "alcoholvrij" filter. */
  private readonly alcoholicIds = computed(() => {
    const cats = new Set<string>(ALCOHOLIC_INGREDIENT_CATEGORIES);
    const ids = new Set<string>();
    for (const ing of this.ingredients()) {
      if (ing.category && cats.has(ing.category)) ids.add(ing.id);
    }
    return ids;
  });

  readonly visible = computed(() => {
    const spirit = this.spirit();
    const alcoholFree = this.alcoholFreeOnly();
    const sort = this.sort();
    let list = this.cocktails();
    if (this.onlyFavs()) list = list.filter((c) => this.favorites.has(c.id));
    if (spirit) list = list.filter((c) => c.baseSpirit === spirit);
    if (alcoholFree) list = list.filter((c) => this.isAlcoholFree(c));
    return [...list].sort((a, b) => this.compare(a, b, sort));
  });

  readonly hasActiveFilters = computed(
    () =>
      this.onlyFavs() ||
      this.spirit() !== null ||
      this.alcoholFreeOnly() ||
      this.sort() !== 'name-asc' ||
      this.searchCtrl.value.trim().length > 0,
  );

  private readonly query = toSignal(
    this.searchCtrl.valueChanges.pipe(debounceTime(250), startWith(this.searchCtrl.value)),
    { initialValue: '' },
  );

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    // Cocktail list (with name / ingredient search).
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

  spiritLabel(s: BaseSpirit): string {
    return BASE_SPIRIT_LABELS[s];
  }

  toggleSpirit(s: BaseSpirit): void {
    this.spirit.update((cur) => (cur === s ? null : s));
  }

  onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortKey);
  }

  clearFilters(): void {
    this.onlyFavs.set(false);
    this.spirit.set(null);
    this.alcoholFreeOnly.set(false);
    this.sort.set('name-asc');
    this.searchCtrl.setValue('');
  }

  /** No non-optional, non-garnish line references an alcoholic ingredient. */
  private isAlcoholFree(c: Cocktail): boolean {
    const alco = this.alcoholicIds();
    return !c.ingredients.some(
      (i) =>
        !i.optional &&
        i.role !== 'garnish' &&
        i.role !== 'seasoning' &&
        alco.has(i.ingredientId),
    );
  }

  private compare(a: Cocktail, b: Cocktail, sort: SortKey): number {
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'difficulty') {
      const rank = (c: Cocktail): number => (c.difficulty ? DIFFICULTIES.indexOf(c.difficulty) : 99);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
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
