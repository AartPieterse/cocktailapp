import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  type CreateIngredient,
  type Ingredient,
  type IngredientCategory,
  INGREDIENT_CATEGORIES,
} from '@cocktailapp/shared';
import { IngredientService } from '../../services/ingredient.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-ingredient-list',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h1>Ingredients</h1>

    <form class="add-row" (ngSubmit)="save()">
      <mat-form-field appearance="fill">
        <mat-label>Name</mat-label>
        <input matInput [formControl]="nameCtrl" required />
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Category</mat-label>
        <mat-select [formControl]="categoryCtrl">
          <mat-option [value]="null">— geen —</mat-option>
          @for (cat of categories; track cat) {
            <mat-option [value]="cat">{{ cat }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-flat-button type="submit" [disabled]="!nameCtrl.value.trim()">
        {{ editingId() ? 'Bijwerken' : 'Toevoegen' }}
      </button>
      @if (editingId()) {
        <button mat-button type="button" (click)="cancelEdit()">Annuleren</button>
      }
    </form>

    <hr />

    <div class="list">
      @for (ing of ingredients(); track ing.id) {
        <div class="item">
          <span class="name">{{ ing.name }}</span>
          <span class="category">{{ ing.category ?? '—' }}</span>
          <span class="spacer"></span>
          <button mat-icon-button type="button" (click)="edit(ing)" aria-label="edit">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button type="button" (click)="remove(ing)" aria-label="delete">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      } @empty {
        <p>Nog geen ingrediënten.</p>
      }
    </div>
  `,
  styles: `
    .add-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .list {
      max-width: 640px;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .name {
      font-weight: 500;
      min-width: 180px;
    }
    .category {
      text-transform: capitalize;
      color: var(--mat-sys-on-surface-variant);
    }
    .spacer {
      flex: 1 1 auto;
    }
  `,
})
export class IngredientList {
  private readonly ingredientService = inject(IngredientService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly categories = INGREDIENT_CATEGORIES;
  readonly ingredients = signal<Ingredient[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly nameCtrl = new FormControl('', { nonNullable: true });
  readonly categoryCtrl = new FormControl<IngredientCategory | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));
  }

  save(): void {
    const name = this.nameCtrl.value.trim();
    if (!name) return;
    const dto: CreateIngredient = { name, category: this.categoryCtrl.value ?? undefined };
    const id = this.editingId();
    const request = id
      ? this.ingredientService.update(id, dto)
      : this.ingredientService.create(dto);

    request.subscribe({
      next: () => {
        this.snackBar.open(id ? 'Ingrediënt bijgewerkt' : 'Ingrediënt toegevoegd', 'OK', {
          duration: 2000,
        });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        const message =
          err?.status === 409 ? 'Bestaat al' : 'Opslaan mislukt';
        this.snackBar.open(message, 'OK', { duration: 2500 });
      },
    });
  }

  edit(ingredient: Ingredient): void {
    this.editingId.set(ingredient.id);
    this.nameCtrl.setValue(ingredient.name);
    this.categoryCtrl.setValue(ingredient.category ?? null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.nameCtrl.setValue('');
    this.categoryCtrl.setValue(null);
  }

  remove(ingredient: Ingredient): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Ingrediënt "${ingredient.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.ingredientService.remove(ingredient.id).subscribe(() => {
        this.snackBar.open('Ingrediënt verwijderd', 'OK', { duration: 2000 });
        this.load();
      });
    });
  }
}
