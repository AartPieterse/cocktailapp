import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  type Cocktail,
  type CreateCocktail,
  type CreateCocktailIngredient,
  type Ingredient,
  MEASURE_LABELS,
  MEASURE_UNITS,
  type MeasureUnit,
} from '@cocktailapp/shared';
import { startWith } from 'rxjs';
import { IngredientService } from '../../services/ingredient.service';
import { CocktailService } from '../../services/cocktail.service';

@Component({
  selector: 'app-cocktail-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <h2>{{ editingId() ? 'Cocktail bewerken' : 'Add cocktail' }}</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
      <mat-form-field appearance="fill" class="full">
        <mat-label>Title</mat-label>
        <input matInput type="text" formControlName="name" required />
        @if (form.controls.name.hasError('required')) {
          <mat-error>Title is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Description</mat-label>
        <input matInput type="text" formControlName="description" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Image URL</mat-label>
        <input matInput type="url" formControlName="imageUrl" placeholder="https://..." />
      </mat-form-field>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Tags</mat-label>
        <mat-chip-grid #chipGrid>
          @for (tag of tags(); track tag) {
            <mat-chip-row (removed)="removeTag(tag)">
              {{ tag }}
              <button matChipRemove type="button" [attr.aria-label]="'remove ' + tag">
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip-row>
          }
          <input
            placeholder="Nieuwe tag..."
            [matChipInputFor]="chipGrid"
            (matChipInputTokenEnd)="addTag($event)"
          />
        </mat-chip-grid>
      </mat-form-field>

      <h3>Ingredienten</h3>
      <p>Voeg ingredienten één voor één toe</p>
      @if (addedIngredients().length) {
        <ul class="added">
          @for (line of addedIngredients(); track $index) {
            <li>
              {{ line.amount }} {{ measureLabels[line.unit] }} {{ line.name }}
              <button mat-icon-button type="button" (click)="removeIngredient($index)">
                <mat-icon>delete</mat-icon>
              </button>
            </li>
          }
        </ul>
      }

      <div class="ingredient-row">
        <mat-form-field appearance="fill">
          <mat-label>Ingredient</mat-label>
          <input matInput [formControl]="ingredientCtrl" [matAutocomplete]="auto" />
          <mat-autocomplete #auto="matAutocomplete">
            @for (option of filteredIngredients(); track option.id) {
              <mat-option [value]="option.name">{{ option.name }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field appearance="fill" class="amount">
          <mat-label>Amount</mat-label>
          <input matInput type="number" min="0" [formControl]="amountCtrl" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Measure</mat-label>
          <mat-select [formControl]="unitCtrl">
            @for (unit of units; track unit) {
              <mat-option [value]="unit">{{ measureLabels[unit] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button mat-button type="button" (click)="addIngredient()">Voeg toe</button>
      </div>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Instructions</mat-label>
        <textarea
          matInput
          rows="5"
          formControlName="instructionsText"
          placeholder="Eén stap per regel"
        ></textarea>
        <mat-hint>Eén stap per regel.</mat-hint>
      </mat-form-field>

      <div class="submit">
        <button mat-flat-button type="submit" [disabled]="form.invalid">Opslaan</button>
        <button mat-button type="button" (click)="cancel()">Annuleren</button>
      </div>
    </form>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      max-width: 640px;
    }
    .full {
      width: 100%;
    }
    .ingredient-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .amount {
      max-width: 120px;
    }
    .added {
      list-style: none;
      padding: 0;
    }
    .added li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .submit {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
  `,
})
export class CocktailForm {
  private readonly fb = inject(FormBuilder);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly units = MEASURE_UNITS;
  readonly measureLabels = MEASURE_LABELS;

  readonly editingId = signal<string | null>(null);
  readonly tags = signal<string[]>([]);
  readonly addedIngredients = signal<CreateCocktailIngredient[]>([]);
  readonly ingredientOptions = signal<Ingredient[]>([]);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    imageUrl: [''],
    instructionsText: [''],
  });

  readonly ingredientCtrl = new FormControl('', { nonNullable: true });
  readonly amountCtrl = new FormControl(1, { nonNullable: true });
  readonly unitCtrl = new FormControl<MeasureUnit>('ml', { nonNullable: true });

  private readonly query = toSignal(this.ingredientCtrl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  });

  readonly filteredIngredients = computed(() => {
    const q = (this.query() ?? '').toLowerCase();
    return this.ingredientOptions().filter((i) => i.name.toLowerCase().includes(q));
  });

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredientOptions.set(list));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.cocktailService.getOne(id).subscribe((c) => this.patchFrom(c));
    }
  }

  addIngredient(): void {
    const name = this.ingredientCtrl.value.trim();
    if (!name) return;
    const line: CreateCocktailIngredient = {
      name,
      amount: Number(this.amountCtrl.value) || 1,
      unit: this.unitCtrl.value,
    };
    this.addedIngredients.update((list) => [...list, line]);
    this.ingredientCtrl.setValue('');
    this.amountCtrl.setValue(1);
  }

  removeIngredient(index: number): void {
    this.addedIngredients.update((list) => list.filter((_, i) => i !== index));
  }

  addTag(event: MatChipInputEvent): void {
    const value = event.value.trim();
    if (value) {
      this.tags.update((list) => [...list, value]);
    }
    event.chipInput.clear();
  }

  removeTag(tag: string): void {
    this.tags.update((list) => list.filter((t) => t !== tag));
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const dto: CreateCocktail = {
      name: (raw.name ?? '').trim(),
      description: raw.description ?? '',
      imageUrl: raw.imageUrl?.trim() || undefined,
      instructions: (raw.instructionsText ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      ingredients: this.addedIngredients(),
      tags: this.tags(),
    };

    const id = this.editingId();
    const request = id
      ? this.cocktailService.update(id, dto)
      : this.cocktailService.create(dto);

    request.subscribe((saved) => {
      this.snackBar.open(id ? 'Cocktail bijgewerkt' : 'Cocktail opgeslagen', 'OK', {
        duration: 2500,
      });
      void this.router.navigate(['/cocktails', saved.id]);
    });
  }

  cancel(): void {
    const id = this.editingId();
    void this.router.navigate(id ? ['/cocktails', id] : ['/cocktails']);
  }

  private patchFrom(cocktail: Cocktail): void {
    this.form.patchValue({
      name: cocktail.name,
      description: cocktail.description,
      imageUrl: cocktail.imageUrl ?? '',
      instructionsText: cocktail.instructions.join('\n'),
    });
    this.tags.set(cocktail.tags ?? []);
    this.addedIngredients.set(
      cocktail.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
    );
  }
}
