import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Cocktail,
  CreateCocktail,
  MakeableResult,
  UpdateCocktail,
} from '@cocktailapp/shared';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CocktailService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}cocktails`;

  getAll(q?: string, tag?: string): Observable<Cocktail[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (tag) params = params.set('tag', tag);
    return this.http.get<Cocktail[]>(this.baseUrl, { params });
  }

  getOne(id: string): Observable<Cocktail> {
    return this.http.get<Cocktail>(`${this.baseUrl}/${id}`);
  }

  getRandom(): Observable<Cocktail> {
    return this.http.get<Cocktail>(`${this.baseUrl}/random`);
  }

  create(dto: CreateCocktail): Observable<Cocktail> {
    return this.http.post<Cocktail>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateCocktail): Observable<Cocktail> {
    return this.http.patch<Cocktail>(`${this.baseUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * "Wat kan ik maken" — cocktails ranked by how many required ingredients you're
   * missing. `maxMissing` 0 = makeable right now; 1+ also returns "bijna" cocktails.
   */
  makeable(availableIngredientIds: string[], maxMissing = 0): Observable<MakeableResult[]> {
    return this.http.post<MakeableResult[]>(`${this.baseUrl}/makeable`, {
      availableIngredientIds,
      maxMissing,
    });
  }
}
