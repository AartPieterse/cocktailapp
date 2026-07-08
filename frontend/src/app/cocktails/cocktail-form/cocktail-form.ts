import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  GLASSWARE,
  GLASSWARE_LABELS,
  type Glassware,
  type Ingredient,
  MEASURE_LABELS,
  MEASURE_UNITS,
  METHODS,
  METHOD_LABELS,
  type MeasureUnit,
  type Method,
} from '@cocktailapp/shared';
import { filter, startWith, switchMap, tap } from 'rxjs';
import { IngredientService } from '../../services/ingredient.service';
import { CocktailService } from '../../services/cocktail.service';

type IngredientChoice = string | Ingredient;

@Component({
  selector: 'app-cocktail-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <a class="back" routerLink="/cocktails"><mat-icon>arrow_back</mat-icon> Cocktails</a>
    <h1>{{ editingId() ? 'Cocktail bewerken' : 'Nieuwe cocktail' }}</h1>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
      <div class="section">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Naam</mat-label>
          <input matInput formControlName="name" required />
          @if (form.controls.name.hasError('required') && form.controls.name.touched) {
            <mat-error>Naam is verplicht</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Omschrijving</mat-label>
          <textarea matInput rows="2" formControlName="description"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Afbeelding-URL (optioneel)</mat-label>
          <input matInput type="url" formControlName="imageUrl" placeholder="https://…" />
          <mat-hint>Leeg laten? Dan tonen we een stijlvol standaardbeeld.</mat-hint>
        </mat-form-field>
      </div>

      <div class="section grid3">
        <mat-form-field appearance="outline">
          <mat-label>Glas</mat-label>
          <mat-select formControlName="glass">
            <mat-option [value]="null">— geen —</mat-option>
            @for (g of glassware; track g) {
              <mat-option [value]="g">{{ glassLabels[g] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Methode</mat-label>
          <mat-select formControlName="method">
            <mat-option [value]="null">— geen —</mat-option>
            @for (m of methods; track m) {
              <mat-option [value]="m">{{ methodLabels[m] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Niveau</mat-label>
          <mat-select formControlName="difficulty">
            <mat-option [value]="null">— geen —</mat-option>
            @for (d of difficulties; track d) {
              <mat-option [value]="d">{{ difficultyLabels[d] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Garnering</mat-label>
          <input matInput formControlName="garnish" placeholder="bv. schijfje limoen" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Aantal glazen</mat-label>
          <input matInput type="number" min="1" formControlName="servings" />
        </mat-form-field>
      </div>

      <div class="section">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Tags</mat-label>
          <mat-chip-grid #chipGrid aria-label="Tags">
            @for (tag of tags(); track tag) {
              <mat-chip-row (removed)="removeTag(tag)">
                {{ tag }}
                <button matChipRemove type="button" [attr.aria-label]="'verwijder ' + tag">
                  <mat-icon>cancel</mat-icon>
                </button>
              </mat-chip-row>
            }
            <input placeholder="Nieuwe tag…" [matChipInputFor]="chipGrid" (matChipInputTokenEnd)="addTag($event)" />
          </mat-chip-grid>
        </mat-form-field>
      </div>

      <div class="section">
        <h3>Ingrediënten</h3>
        @if (addedIngredients().length) {
          <ul class="added">
            @for (line of addedIngredients(); track $index) {
              <li>
                <span class="amt">{{ line.amount }} {{ measureLabels[line.unit] }}</span>
                <span class="nm">
                  {{ line.name }}
                  @if (line.optional) { <em>optioneel</em> }
                  @if (line.note) { <span class="muted">— {{ line.note }}</span> }
                </span>
                <button mat-icon-button type="button" (click)="removeIngredient($index)" aria-label="verwijder">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Nog geen ingrediënten toegevoegd.</p>
        }

        <div class="ingredient-row">
          <mat-form-field appearance="outline" class="ing-name">
            <mat-label>Ingrediënt</mat-label>
            <input matInput [formControl]="ingredientCtrl" [matAutocomplete]="auto" />
            <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayIngredient">
              @for (option of filteredIngredients(); track option.id) {
                <mat-option [value]="option">{{ option.name }}</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

          <mat-form-field appearance="outline" class="amount">
            <mat-label>Hoev.</mat-label>
            <input matInput type="number" min="0" [formControl]="amountCtrl" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="unit">
            <mat-label>Eenheid</mat-label>
            <mat-select [formControl]="unitCtrl">
              @for (unit of units; track unit) {
                <mat-option [value]="unit">{{ measureLabels[unit] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-checkbox [formControl]="optionalCtrl">Optioneel</mat-checkbox>
          <button mat-flat-button type="button" (click)="addIngredient()">
            <mat-icon>add</mat-icon> Toevoegen
          </button>
        </div>
      </div>

      <div class="section">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Bereiding</mat-label>
          <textarea matInput rows="6" formControlName="instructionsText" placeholder="Eén stap per regel"></textarea>
          <mat-hint>Eén stap per regel.</mat-hint>
        </mat-form-field>
      </div>

      <div class="submit">
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Bezig…' : 'Opslaan' }}
        </button>
        <button mat-button type="button" (click)="cancel()">Annuleren</button>
      </div>
    </form>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--muted);
      font-size: var(--step--1);
      margin-bottom: var(--sp-3);
    }
    .back:hover {
      color: var(--accent);
    }
    .form {
      max-width: 760px;
    }
    .section {
      margin-bottom: var(--sp-5);
    }
    .section h3 {
      margin-bottom: var(--sp-3);
    }
    .full {
      width: 100%;
    }
    .grid3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--sp-3);
    }
    .added {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--sp-3);
    }
    .added li {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--hairline);
    }
    .added .amt {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      min-width: 90px;
    }
    .added .nm {
      flex: 1;
    }
    .added em {
      color: var(--faint);
      font-size: var(--step--1);
      margin-left: 4px;
    }
    .ingredient-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-2);
    }
    .ing-name {
      flex: 1;
      min-width: 200px;
    }
    .amount {
      width: 100px;
    }
    .unit {
      width: 140px;
    }
    .submit {
      display: flex;
      gap: var(--sp-2);
      margin-top: var(--sp-4);
    }
  `,
})
export class CocktailForm {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly units = MEASURE_UNITS;
  readonly measureLabels = MEASURE_LABELS;
  readonly glassware = GLASSWARE;
  readonly glassLabels = GLASSWARE_LABELS;
  readonly methods = METHODS;
  readonly methodLabels = METHOD_LABELS;
  readonly difficulties = DIFFICULTIES;
  readonly difficultyLabels = DIFFICULTY_LABELS;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly tags = signal<string[]>([]);
  readonly addedIngredients = signal<CreateCocktailIngredient[]>([]);
  readonly ingredientOptions = signal<Ingredient[]>([]);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    imageUrl: [''],
    glass: [null as Glassware | null],
    method: [null as Method | null],
    difficulty: [null as Difficulty | null],
    garnish: [''],
    servings: [1],
    instructionsText: [''],
  });

  readonly ingredientCtrl = new FormControl<IngredientChoice>('', { nonNullable: true });
  readonly amountCtrl = new FormControl(4, { nonNullable: true });
  readonly unitCtrl = new FormControl<MeasureUnit>('cl', { nonNullable: true });
  readonly optionalCtrl = new FormControl(false, { nonNullable: true });

  private readonly query = toSignal(this.ingredientCtrl.valueChanges.pipe(startWith('')), {
    initialValue: '' as IngredientChoice,
  });

  readonly filteredIngredients = computed(() => {
    const v = this.query();
    const q = (typeof v === 'string' ? v : v?.name ?? '').toLowerCase();
    return this.ingredientOptions().filter((i) => i.name.toLowerCase().includes(q));
  });

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredientOptions.set(list));

    // The route id arrives via component-input binding *after* construction, so read it
    // reactively (never synchronously in the constructor, or edit would silently "create").
    toObservable(this.id)
      .pipe(
        filter((id): id is string => !!id),
        tap((id) => this.editingId.set(id)),
        switchMap((id) => this.cocktailService.getOne(id)),
        takeUntilDestroyed(),
      )
      .subscribe((c) => this.patchFrom(c));
  }

  displayIngredient(value: IngredientChoice): string {
    return typeof value === 'string' ? value : value?.name ?? '';
  }

  addIngredient(): void {
    const v = this.ingredientCtrl.value;
    const name = (typeof v === 'string' ? v : v?.name ?? '').trim();
    if (!name) return;
    const id =
      typeof v === 'object' && v
        ? v.id
        : this.ingredientOptions().find((o) => o.name.toLowerCase() === name.toLowerCase())?.id;

    const line: CreateCocktailIngredient = {
      ...(id ? { ingredientId: id } : {}),
      name,
      amount: Number(this.amountCtrl.value) || 1,
      unit: this.unitCtrl.value,
      optional: this.optionalCtrl.value,
    };
    this.addedIngredients.update((list) => [...list, line]);
    this.ingredientCtrl.setValue('');
    this.amountCtrl.setValue(4);
    this.optionalCtrl.setValue(false);
  }

  removeIngredient(index: number): void {
    this.addedIngredients.update((list) => list.filter((_, i) => i !== index));
  }

  addTag(event: MatChipInputEvent): void {
    const value = event.value.trim();
    if (value && !this.tags().includes(value)) {
      this.tags.update((list) => [...list, value]);
    }
    event.chipInput.clear();
  }

  removeTag(tag: string): void {
    this.tags.update((list) => list.filter((t) => t !== tag));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const dto: CreateCocktail = {
      name: (raw.name ?? '').trim(),
      description: raw.description ?? '',
      imageUrl: raw.imageUrl?.trim() || undefined,
      glass: raw.glass ?? undefined,
      method: raw.method ?? undefined,
      difficulty: raw.difficulty ?? undefined,
      garnish: raw.garnish?.trim() || undefined,
      servings: Number(raw.servings) || 1,
      instructions: (raw.instructionsText ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      ingredients: this.addedIngredients(),
      tags: this.tags(),
    };

    const id = this.editingId();
    this.saving.set(true);
    const request = id
      ? this.cocktailService.update(id, dto)
      : this.cocktailService.create(dto);

    request.subscribe({
      next: (saved) => {
        this.snackBar.open(id ? 'Cocktail bijgewerkt' : 'Cocktail opgeslagen', 'OK', {
          duration: 2500,
        });
        void this.router.navigate(['/cocktails', saved.id]);
      },
      error: () => this.saving.set(false),
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
      glass: cocktail.glass ?? null,
      method: cocktail.method ?? null,
      difficulty: cocktail.difficulty ?? null,
      garnish: cocktail.garnish ?? '',
      servings: cocktail.servings ?? 1,
      instructionsText: cocktail.instructions.join('\n'),
    });
    this.tags.set(cocktail.tags ?? []);
    this.addedIngredients.set(
      cocktail.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        note: i.note,
        optional: i.optional,
      })),
    );
  }
}
