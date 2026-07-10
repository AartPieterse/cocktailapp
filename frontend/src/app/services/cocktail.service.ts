import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Cocktail,
  CreateCocktail,
  MakeableResult,
  UpdateCocktail,
} from '@cocktailapp/shared';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LanguageService } from '../core/language.service';
import { CatalogService } from './catalog.service';

/**
 * Cocktail data access. Reads are served from the static catalog (catalog.json) in
 * production and from the NestJS backend in dev — controlled by environment.dataSource.
 * Writes require the backend and are disabled in the static build (the admin UI that would
 * call them is hidden in production; see environment.admin).
 */
@Injectable({ providedIn: 'root' })
export class CocktailService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  private readonly lang = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}cocktails`;
  private readonly static = environment.dataSource === 'static';

  private readOnly<T>(): Observable<T> {
    return throwError(() => new Error(this.lang.t().errors.readOnly));
  }

  getAll(q?: string, tag?: string): Observable<Cocktail[]> {
    if (this.static) return this.catalog.listCocktails(q, tag);
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (tag) params = params.set('tag', tag);
    return this.http.get<Cocktail[]>(this.baseUrl, { params });
  }

  getOne(id: string): Observable<Cocktail> {
    if (this.static) return this.catalog.getCocktail(id);
    return this.http.get<Cocktail>(`${this.baseUrl}/${id}`);
  }

  getRandom(): Observable<Cocktail> {
    if (this.static) return this.catalog.randomCocktail();
    return this.http.get<Cocktail>(`${this.baseUrl}/random`);
  }

  create(dto: CreateCocktail): Observable<Cocktail> {
    if (this.static) return this.readOnly();
    return this.http.post<Cocktail>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateCocktail): Observable<Cocktail> {
    if (this.static) return this.readOnly();
    return this.http.patch<Cocktail>(`${this.baseUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    if (this.static) return this.readOnly();
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * "Wat kan ik maken" — cocktails ranked by how many required ingredients you're
   * missing. `maxMissing` 0 = makeable right now; 1+ also returns "bijna" cocktails.
   */
  makeable(availableIngredientIds: string[], maxMissing = 0): Observable<MakeableResult[]> {
    if (this.static) return this.catalog.makeable(availableIngredientIds, maxMissing);
    return this.http.post<MakeableResult[]>(`${this.baseUrl}/makeable`, {
      availableIngredientIds,
      maxMissing,
    });
  }
}
