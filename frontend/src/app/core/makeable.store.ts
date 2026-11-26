import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { expandCabinet, type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { CabinetService } from './cabinet.service';
import { SubstitutesService } from './substitutes.service';

/**
 * What the bar makes right now, computed once for the whole app.
 *
 * Ontdek draws its day's pick from it, Mijn bar lists it, and the ingredient page counts it while
 * you tick. Each used to run the same cabinet → `expandCabinet` → `makeable` pipeline on its own;
 * one root store keeps them in step and computes the list once per change of the cabinet, the
 * substitutes switch or the ingredient catalog.
 *
 * Variations with swaps are included (`maxMissing` 0 returns them as their own results), which is
 * the standing decision for "wat kan ik maken".
 */
@Injectable({ providedIn: 'root' })
export class MakeableStore {
  private readonly cabinet = inject(CabinetService);
  private readonly subs = inject(SubstitutesService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);

  private readonly _ingredients = signal<Ingredient[]>([]);
  private readonly _results = signal<MakeableResult[]>([]);
  private readonly _loading = signal(true);

  /** The ingredient catalog, for callers that need categories or ABV (the alcohol-free filter). */
  readonly ingredients = this._ingredients.asReadonly();
  /** True until the first result for the current cabinet has arrived. */
  readonly loading = this._loading.asReadonly();
  /** Every drink, variations included, that the bar can make with nothing missing. */
  readonly makeable = computed(() => this._results().filter((r) => r.missingCount === 0));
  /** Plain recipes only: a variation is not a family's example or a lesson's showcase. */
  readonly makeableCocktails = computed(() =>
    this.makeable()
      .filter((r) => !r.variation)
      .map((r) => r.cocktail),
  );

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this._ingredients.set(list));

    combineLatest([
      toObservable(this.cabinet.ids),
      toObservable(this.subs.enabled),
      toObservable(this._ingredients),
    ])
      .pipe(
        tap(() => this._loading.set(true)),
        switchMap(([ids, substitutes, ingredients]) => {
          if (!ids.length) return of<MakeableResult[]>([]);
          const query = expandCabinet(ids, ingredients, { substitutes });
          return this.cocktailService
            .makeable(query, 0)
            .pipe(catchError(() => of<MakeableResult[]>([])));
        }),
      )
      .subscribe((res) => {
        this._results.set(res);
        this._loading.set(false);
      });
  }
}
