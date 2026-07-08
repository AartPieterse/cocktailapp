import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import type { Cocktail } from '@cocktailapp/shared';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';
import { CocktailService } from '../services/cocktail.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, CocktailCard],
  template: `
    <h1>Welkom!</h1>
    <p>Hieronder staan alle cocktails</p>
    <button mat-flat-button routerLink="/cocktails">Zoeken op ingredienten</button>
    <hr />
    <div class="grid">
      @for (c of cocktails(); track c.id) {
        <app-cocktail-card [cocktail]="c" />
      } @empty {
        <p>Nog geen cocktails. Voeg er een toe via <a routerLink="/cocktails/add">Add cocktail</a>.</p>
      }
    </div>
  `,
  styles: `
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
  `,
})
export class Dashboard {
  private readonly cocktailService = inject(CocktailService);
  readonly cocktails = signal<Cocktail[]>([]);

  constructor() {
    this.cocktailService
      .getAll()
      .pipe(takeUntilDestroyed())
      .subscribe((list) => this.cocktails.set(list));
  }
}
