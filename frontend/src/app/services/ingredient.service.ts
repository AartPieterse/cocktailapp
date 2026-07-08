import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateIngredient,
  Ingredient,
  IngredientCategory,
  UpdateIngredient,
} from '@cocktailapp/shared';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CatalogService } from './catalog.service';

/**
 * Ingredient data access. Reads come from the static catalog in production and from the
 * NestJS backend in dev (environment.dataSource). Writes require the backend and are
 * disabled in the static build.
 */
@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  private readonly baseUrl = `${environment.apiUrl}ingredients`;
  private readonly static = environment.dataSource === 'static';

  getAll(category?: IngredientCategory): Observable<Ingredient[]> {
    if (this.static) return this.catalog.listIngredients(category);
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Ingredient[]>(this.baseUrl, { params });
  }

  create(dto: CreateIngredient): Observable<Ingredient> {
    if (this.static) return readOnly();
    return this.http.post<Ingredient>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateIngredient): Observable<Ingredient> {
    if (this.static) return readOnly();
    return this.http.patch<Ingredient>(`${this.baseUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    if (this.static) return readOnly();
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

/** The static build is read-only; writes need the backend (dev only). */
function readOnly<T>(): Observable<T> {
  return throwError(() => new Error('De catalogus is alleen-lezen in deze omgeving.'));
}
