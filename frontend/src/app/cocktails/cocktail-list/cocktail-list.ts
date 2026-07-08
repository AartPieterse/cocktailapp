import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Cocktail, Ingredient } from '@cocktailapp/shared';
import { CocktailService } from '../../services/cocktail.service';
import { IngredientService } from '../../services/ingredient.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CocktailCard } from '../cocktail-card/cocktail-card';

@Component({
  selector: 'app-cocktail-list',
  imports: [RouterLink, MatButtonModule, MatCheckboxModule, CocktailCard],
  template: `
    <div class="header">
      <h1>Cocktails</h1>
      <a mat-flat-button routerLink="add">Add cocktail</a>
    </div>

    <section class="filter">
      <h3>Wat heb je in huis?</h3>
      @for (group of grouped(); track group.category) {
        <div class="group">
          <span class="group-label">{{ group.category }}</span>
          @for (ing of group.items; track ing.id) {
            <mat-checkbox
              [checked]="selected().has(ing.id)"
              (change)="toggle(ing.id, $event.checked)"
              >{{ ing.name }}</mat-checkbox
            >
          }
        </div>
      } @empty {
        <p>Nog geen ingrediënten. Voeg ze toe onder <a routerLink="/ingredients">Ingredients</a>.</p>
      }
      <div class="filter-actions">
        <button mat-flat-button (click)="search()">Zoek cocktails</button>
        <button mat-button (click)="reset()">Toon alles</button>
      </div>
    </section>

    <hr />

    <div class="grid">
      @for (c of cocktails(); track c.id) {
        <app-cocktail-card [cocktail]="c">
          <a mat-button [routerLink]="[c.id, 'edit']">Edit</a>
          <button mat-button (click)="remove(c)">Delete</button>
        </app-cocktail-card>
      } @empty {
        <p>Geen cocktails gevonden.</p>
      }
    </div>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .filter {
      margin: 12px 0;
    }
    .group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .group-label {
      text-transform: capitalize;
      font-weight: 600;
      min-width: 90px;
      color: var(--mat-sys-on-surface-variant);
    }
    .filter-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
  `,
})
export class CocktailList {
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly cocktails = signal<Cocktail[]>([]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly selected = signal<Set<string>>(new Set<string>());

  readonly grouped = computed(() => {
    const groups = new Map<string, Ingredient[]>();
    for (const ing of this.ingredients()) {
      const key = ing.category ?? 'other';
      const list = groups.get(key) ?? [];
      list.push(ing);
      groups.set(key, list);
    }
    return [...groups.entries()].map(([category, items]) => ({ category, items }));
  });

  constructor() {
    this.loadAll();
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));
  }

  private loadAll(): void {
    this.cocktailService.getAll().subscribe((list) => this.cocktails.set(list));
  }

  toggle(id: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selected.set(next);
  }

  search(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) {
      this.loadAll();
      return;
    }
    this.cocktailService.search(ids).subscribe((list) => this.cocktails.set(list));
  }

  reset(): void {
    this.selected.set(new Set<string>());
    this.loadAll();
  }

  remove(cocktail: Cocktail): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Cocktail "${cocktail.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(cocktail.id).subscribe(() => {
        this.snackBar.open('Cocktail verwijderd', 'OK', { duration: 2500 });
        this.loadAll();
      });
    });
  }
}
