import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type {
  Catalog,
  Cocktail,
  CatalogTranslations,
  Ingredient,
  IngredientCategory,
  MakeableResult,
} from '@cocktailapp/shared';
import { applyCatalogTranslations, computeMakeable } from '@cocktailapp/shared';
import {
  Observable,
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { LanguageService } from '../core/language.service';

/**
 * Static-first data source. Loads the curated catalog.json (generated at build time from
 * iba-cocktails-seed.json by scripts/build-catalog.mjs), applies the Dutch display overlay
 * (catalog.nl.json, same version), caches it, and serves every read operation in-memory —
 * including the flagship "wat kan ik maken" search via the shared `computeMakeable`. Used when
 * environment.dataSource === 'static'; there is no live backend or database in production.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly lang = inject(LanguageService);

  /** The canonical (English) catalog + Dutch overlay, fetched once and replayed. */
  private readonly source$ = combineLatest([
    this.http.get<Catalog>(environment.catalogUrl),
    environment.translationsUrl
      ? this.http
          .get<CatalogTranslations>(environment.translationsUrl)
          .pipe(catchError(() => of(null)))
      : of(null),
  ]).pipe(shareReplay({ bufferSize: 1, refCount: false }));

  /**
   * The display catalog for the current locale: Dutch applies the overlay, English serves the
   * canonical names. Re-derives (no refetch) when the language switches. A mismatched/failed
   * overlay is ignored inside applyCatalogTranslations (English fallback).
   */
  private readonly catalog$ = combineLatest([this.source$, toObservable(this.lang.locale)]).pipe(
    map(([[catalog, translations], locale]) =>
      locale === 'nl' ? applyCatalogTranslations(catalog, translations) : catalog,
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

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
    const needle = q ? normalize(q.trim()) : '';
    return this.catalog$.pipe(
      map((c) =>
        c.cocktails
          .filter((ck) => !needle || matchesQuery(ck, needle))
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
        if (!c.cocktails.length)
          return throwError(() => new Error(this.lang.t().errors.noCocktails));
        const pick = c.cocktails[Math.floor(Math.random() * c.cocktails.length)];
        return [pick];
      }),
    );
  }

  /**
   * "What can I make with what I have." Returns cocktails ordered by how many *required*
   * ingredients you are missing, up to `maxMissing` (0 = makeable right now). Optional lines
   * never count as missing, and cocktails with no ingredients are excluded. Delegates to the
   * shared `computeMakeable` so the web (Angular) app and the backend agree.
   */
  makeable(availableIngredientIds: string[], maxMissing = 0): Observable<MakeableResult[]> {
    return this.catalog$.pipe(
      map((c) => computeMakeable(c.cocktails, availableIngredientIds, maxMissing)),
    );
  }
}

/** Lowercase + strip diacritics so "cafe" matches "café" and "Curaçao" matches "curacao". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** A cocktail matches the (already-normalized) needle on its name or any ingredient line. */
function matchesQuery(cocktail: Cocktail, needle: string): boolean {
  if (normalize(cocktail.name).includes(needle)) return true;
  return cocktail.ingredients.some(
    (line) =>
      normalize(line.name).includes(needle) ||
      (line.call ? normalize(line.call).includes(needle) : false),
  );
}
