import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { Cocktail } from '@cocktailapp/shared';

/** Presentational cocktail card. Extra action buttons can be projected via <ng-content>. */
@Component({
  selector: 'app-cocktail-card',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  template: `
    <mat-card class="card" appearance="outlined">
      @if (cocktail().imageUrl) {
        <img mat-card-image [src]="cocktail().imageUrl" [alt]="cocktail().name" />
      }
      <mat-card-header>
        <mat-card-title>{{ cocktail().name }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="description">{{ cocktail().description }}</p>
        @if (ingredientSummary()) {
          <p class="ingredients"><strong>{{ ingredientSummary() }}</strong></p>
        }
        @if (cocktail().tags?.length) {
          <p class="tags">
            @for (t of cocktail().tags; track t) {
              <span class="tag">#{{ t }}</span>
            }
          </p>
        }
      </mat-card-content>
      <mat-card-actions>
        <a mat-button [routerLink]="['/cocktails', cocktail().id]">Recipe</a>
        <ng-content />
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .card {
      max-width: 400px;
      margin-bottom: 1%;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .tag {
      font-size: 12px;
      color: var(--mat-sys-primary);
    }
    img[mat-card-image] {
      object-fit: cover;
      max-height: 220px;
    }
  `,
})
export class CocktailCard {
  readonly cocktail = input.required<Cocktail>();

  readonly ingredientSummary = computed(() =>
    this.cocktail()
      .ingredients.map((i) => i.name)
      .join(' · '),
  );
}
