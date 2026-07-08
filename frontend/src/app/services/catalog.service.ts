import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Cocktail, Ingredient, IngredientCategory, MakeableResult } from '@cocktailapp/shared';
import { Observable, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface Catalog {
  ingredients: Ingredient[];
  cocktails: Cocktail[];
}

/**
 * Static-first data source. Loads the curated catalog.json (generated at build time from
 * iba-cocktails-seed.json by scripts/build-catalog.mjs) once, caches it, and serves every
 * read operation in-memory — including the flagship "wat kan ik maken" search, ported 1:1
 * from the backend CocktailsService. Used when environment.dataSource === 'static'; there is
 * no live backend or database in production.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  /** Loaded once and replayed to every subscriber. */
  private readonly catalog$ = this.http
    .get<Catalog>(environment.catalogUrl)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  // --- Ingredients ---

  listIngredients(category?: IngredientCategory): Observable<Ingredient[]> {
    return this.catalog$.pipe(
      map((c) =>
        c.ingredients
          .filter((ing) => !category || ing.category === category)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );
  }

  // --- Cocktails ---

  listCocktails(q?: string, tag?: string): Observable<Cocktail[]> {
    const needle = q?.trim().toLowerCase();
    return this.catalog$.pipe(
      map((c) =>
        c.cocktails
          .filter((ck) => !needle || ck.name.toLowerCase().includes(needle))
          .filter((ck) => !tag || (ck.tags ?? []).includes(tag))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );
  }

  getCocktail(id: string): Observable<Cocktail> {
    return this.catalog$.pipe(
      switchMap((c) => {
        const found = c.cocktails.find((ck) => ck.id === id);
        return found ? [found] : throwError(() => new Error(`Cocktail ${id} not found`));
      }),
    );
  }

  randomCocktail(): Observable<Cocktail> {
    return this.catalog$.pipe(
      switchMap((c) => {
        if (!c.cocktails.length) return throwError(() => new Error('Er zijn nog geen cocktails'));
        const pick = c.cocktails[Math.floor(Math.random() * c.cocktails.length)];
        return [pick];
      }),
    );
  }

  /**
   * "What can I make with what I have." Returns cocktails ordered by how many *required*
   * ingredients you are missing, up to `maxMissing` (0 = makeable right now). Optional lines
   * never count as missing, and cocktails with no ingredients are excluded. Mirrors the
   * backend aggregation in CocktailsService.makeable.
   */
  makeable(availableIngredientIds: string[], maxMissing = 0): Observable<MakeableResult[]> {
    const available = new Set(availableIngredientIds);
    return this.catalog$.pipe(
      map((c) =>
        c.cocktails
          .filter((ck) => ck.ingredients.length > 0)
          .map((ck) => {
            const missing = ck.ingredients
              .filter((line) => !line.optional && !available.has(line.ingredientId))
              .map((line) => ({ ingredientId: line.ingredientId, name: line.name }));
            return { cocktail: ck, missing, missingCount: missing.length };
          })
          .filter((r) => r.missingCount <= maxMissing)
          .sort((a, b) => a.missingCount - b.missingCount || a.cocktail.name.localeCompare(b.cocktail.name)),
      ),
    );
  }
}
