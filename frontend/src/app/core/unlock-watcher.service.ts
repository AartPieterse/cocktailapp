import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { expandCabinet, type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { CabinetService } from './cabinet.service';
import { SubstitutesService } from './substitutes.service';
import { ToastService } from './toast.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';

/**
 * Watches the cabinet and, whenever the user *adds* ingredient(s), raises a toast:
 *  - "+N ontgrendeld" listing any cocktails that became makeable, or
 *  - "X toegevoegd aan je kast" when the add unlocked nothing new.
 *
 * Runs app-wide (instantiated by the Layout) so it fires no matter which surface triggered the
 * add — bar sidebar, cocktail detail, or the cabinet editor. It deliberately never toasts on
 * removals, on the initial load, on a substitutes-toggle reshuffle, or on a bulk import such as
 * finishing the wizard (guarded by {@link BULK_ADD_THRESHOLD}).
 */
const BULK_ADD_THRESHOLD = 5;

@Injectable({ providedIn: 'root' })
export class UnlockWatcher {
  private readonly cabinet = inject(CabinetService);
  private readonly subs = inject(SubstitutesService);
  private readonly toast = inject(ToastService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  private readonly ingredients = signal<Ingredient[]>([]);
  private readonly cocktailNames = new Map<string, string>();
  private prevCabinet = new Set<string>();
  private prevMakeable = new Set<string>();
  private primed = false;

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    // Cocktail-id → name lookup for the unlock toast's subtitle.
    this.cocktailService
      .getAll()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        for (const c of list) this.cocktailNames.set(c.id, c.name);
      });

    combineLatest([
      toObservable(this.cabinet.ids),
      toObservable(this.subs.enabled),
      toObservable(this.ingredients),
    ])
      .pipe(
        switchMap(([ids, substitutes, ingredients]) => {
          const query = expandCabinet(ids, ingredients, { substitutes });
          return this.cocktailService.makeable(query, 0).pipe(
            catchError(() => of<MakeableResult[]>([])),
            map((res) => ({
              cabinet: new Set(ids),
              makeable: new Set(res.map((r) => r.cocktail.id)),
            })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ cabinet, makeable }) => this.report(cabinet, makeable));
  }

  private report(cabinet: Set<string>, makeable: Set<string>): void {
    // First emission (plus the follow-up once ingredients load) only establishes the baseline.
    if (!this.primed) {
      this.prevCabinet = cabinet;
      this.prevMakeable = makeable;
      this.primed = true;
      return;
    }

    const added = [...cabinet].filter((id) => !this.prevCabinet.has(id));
    const unlocked = [...makeable].filter((id) => !this.prevMakeable.has(id));
    this.prevCabinet = cabinet;
    this.prevMakeable = makeable;

    // Only celebrate genuine, human-scale additions (never removals or the wizard's bulk set).
    if (added.length === 0 || added.length > BULK_ADD_THRESHOLD) return;

    if (unlocked.length) {
      this.toast.unlock(unlocked.map((id) => this.cocktailNames.get(id) ?? id));
    } else if (added.length === 1) {
      this.toast.info(`${this.ingredientName(added[0])} toegevoegd aan je kast`);
    } else {
      this.toast.info(`${added.length} ingrediënten toegevoegd`);
    }
  }

  private ingredientName(id: string): string {
    return this.ingredients().find((i) => i.id === id)?.name ?? id;
  }
}
