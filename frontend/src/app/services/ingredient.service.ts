import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateIngredient,
  Ingredient,
  IngredientCategory,
  UpdateIngredient,
} from '@cocktailapp/shared';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}ingredients`;

  getAll(category?: IngredientCategory): Observable<Ingredient[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Ingredient[]>(this.baseUrl, { params });
  }

  create(dto: CreateIngredient): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateIngredient): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.baseUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
