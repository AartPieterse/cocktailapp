import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type CreateIngredient,
  type Ingredient,
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  CATEGORY_LABELS,
} from '@cocktailapp/shared';
import { LanguageService } from '../../core/language.service';
import { IngredientService } from '../../services/ingredient.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { environment } from '../../../environments/environment';

interface Group {
  category: IngredientCategory;
  label: string;
  items: Ingredient[];
}

@Component({
  selector: 'app-ingredient-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">{{ lang.t().ingredients.eyebrow }}</p>
        <h1>{{ lang.t().ingredients.title }}</h1>
        @if (admin) {
          <p class="lede">{{ lang.t().ingredients.ledeAdmin }}</p>
        } @else {
          <p class="lede">{{ lang.t().ingredients.ledeUser }}</p>
        }
      </div>
    </header>

    @if (admin) {
      <form class="add-row" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="name">
          <mat-label>{{ lang.t().ingredients.name }}</mat-label>
          <input matInput [formControl]="nameCtrl" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="cat">
          <mat-label>{{ lang.t().ingredients.category }}</mat-label>
          <mat-select [formControl]="categoryCtrl">
            <mat-option [value]="null">{{ lang.t().ingredients.none }}</mat-option>
            @for (cat of categories; track cat) {
              <mat-option [value]="cat">{{ catLabels()[cat] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-checkbox [formControl]="stapleCtrl">{{ lang.t().ingredients.staple }}</mat-checkbox>

        <button mat-flat-button type="submit" [disabled]="!nameCtrl.value.trim()">
          {{ editingId() ? lang.t().ingredients.update : lang.t().ingredients.add }}
        </button>
        @if (editingId()) {
          <button mat-button type="button" (click)="cancelEdit()">{{ lang.t().ingredients.cancel }}</button>
        }
      </form>
    }

    @if (loading()) {
      <p class="muted">{{ lang.t().ingredients.loading }}</p>
    } @else {
      @for (group of grouped(); track group.category) {
        <section class="group">
          <h3>{{ group.label }} <span class="muted count">{{ group.items.length }}</span></h3>
          <div class="items">
            @for (ing of group.items; track ing.id) {
              <div class="item" [class.editing]="editingId() === ing.id">
                <span class="name-cell">{{ ing.name }}</span>
                @if (ing.isStaple) {
                  <span class="pill pill--ok">{{ lang.t().ingredients.stapleTag }}</span>
                }
                <span class="spacer"></span>
                @if (admin) {
                  <button mat-icon-button type="button" (click)="edit(ing)" [attr.aria-label]="lang.t().ingredients.edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button type="button" (click)="remove(ing)" [attr.aria-label]="lang.t().ingredients.delete">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        </section>
      } @empty {
        <div class="empty">
          <p class="muted">{{ lang.t().ingredients.empty }}</p>
          <a mat-stroked-button routerLink="/bar/wizard">{{ lang.t().ingredients.toWizard }}</a>
        </div>
      }
    }
  `,
  styles: `
    .head {
      margin-bottom: var(--sp-5);
    }
    .head h1 {
      margin: 0 0 var(--sp-2);
    }
    .add-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-4);
      background: var(--surface-2);
      border-radius: var(--radius-lg);
      margin-bottom: var(--sp-6);
    }
    .name {
      flex: 1;
      min-width: 200px;
    }
    .cat {
      min-width: 180px;
    }
    .group {
      margin-bottom: var(--sp-5);
    }
    .group h3 {
      font-size: var(--step-1);
      margin-bottom: var(--sp-2);
      padding-bottom: var(--sp-2);
      border-bottom: 1px solid var(--hairline);
    }
    .group .count {
      font-size: var(--step--1);
      font-family: var(--font-body);
      font-weight: 400;
    }
    .items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 2px var(--sp-5);
    }
    .item {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      padding: 4px 0;
    }
    .item.editing {
      background: var(--accent-soft);
      border-radius: var(--radius);
      padding-left: var(--sp-2);
    }
    .name-cell {
      font-weight: 500;
    }
    .spacer {
      flex: 1;
    }
    .empty {
      text-align: center;
      padding: var(--sp-7) 0;
    }
  `,
})
export class IngredientList {
  private readonly ingredientService = inject(IngredientService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly lang = inject(LanguageService);

  protected readonly admin = environment.admin;
  readonly categories = INGREDIENT_CATEGORIES;
  readonly catLabels = computed(() => CATEGORY_LABELS[this.lang.locale()]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly loading = signal(true);

  readonly nameCtrl = new FormControl('', { nonNullable: true });
  readonly categoryCtrl = new FormControl<IngredientCategory | null>(null);
  readonly stapleCtrl = new FormControl(false, { nonNullable: true });

  readonly grouped = computed<Group[]>(() => {
    const map = new Map<IngredientCategory, Ingredient[]>();
    for (const ing of this.ingredients()) {
      const key = (ing.category ?? 'other') as IngredientCategory;
      const list = map.get(key) ?? [];
      list.push(ing);
      map.set(key, list);
    }
    const plural = CATEGORY_LABELS_PLURAL[this.lang.locale()];
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      label: plural[c],
      items: (map.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.ingredientService.getAll().subscribe({
      next: (list) => {
        this.ingredients.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    const name = this.nameCtrl.value.trim();
    if (!name) return;
    const dto: CreateIngredient = {
      name,
      category: this.categoryCtrl.value ?? undefined,
      isStaple: this.stapleCtrl.value,
    };
    const id = this.editingId();
    const request = id
      ? this.ingredientService.update(id, dto)
      : this.ingredientService.create(dto);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          id ? this.lang.t().ingredients.updated : this.lang.t().ingredients.added,
          this.lang.t().common.ok,
          { duration: 2000 },
        );
        this.cancelEdit();
        this.load();
      },
      // Errors are surfaced by the global HTTP interceptor; swallow here so the
      // stream doesn't error out.
      error: () => undefined,
    });
  }

  edit(ingredient: Ingredient): void {
    this.editingId.set(ingredient.id);
    this.nameCtrl.setValue(ingredient.name);
    this.categoryCtrl.setValue(ingredient.category ?? null);
    this.stapleCtrl.setValue(!!ingredient.isStaple);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.nameCtrl.setValue('');
    this.categoryCtrl.setValue(null);
    this.stapleCtrl.setValue(false);
  }

  remove(ingredient: Ingredient): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: this.lang.t().ingredients.confirmDelete(ingredient.name) },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.ingredientService.remove(ingredient.id).subscribe({
        next: () => {
          this.snackBar.open(this.lang.t().ingredients.deleted, this.lang.t().common.ok, { duration: 2000 });
          this.load();
        },
        // 409 (in use) is surfaced by the global error interceptor; swallow here.
        error: () => undefined,
      });
    });
  }
}
