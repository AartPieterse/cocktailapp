import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { type Cocktail, MEASURE_LABELS, type MeasureUnit } from '@cocktailapp/shared';
import { CocktailService } from '../../services/cocktail.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-cocktail-detail',
  imports: [RouterLink, MatButtonModule, MatDividerModule],
  template: `
    @if (cocktail(); as c) {
      <div class="detail">
        @if (c.imageUrl) {
          <img class="hero" [src]="c.imageUrl" [alt]="c.name" />
        }
        <h1>{{ c.name }}</h1>
        <p>{{ c.description }}</p>
        @if (c.tags?.length) {
          <p class="tags">
            @for (t of c.tags; track t) {
              <span class="tag">#{{ t }}</span>
            }
          </p>
        }
        <div class="actions">
          <a mat-flat-button [routerLink]="['/cocktails', c.id, 'edit']">Edit</a>
          <button mat-button (click)="remove(c)">Delete</button>
        </div>

        <mat-divider />
        <h2>Ingredients</h2>
        @for (i of c.ingredients; track i.ingredientId) {
          <p>{{ i.amount }} {{ label(i.unit) }} of {{ i.name }}</p>
        } @empty {
          <p>Geen ingrediënten opgegeven.</p>
        }

        <mat-divider />
        <h2>Instructions</h2>
        @if (c.instructions.length) {
          <ol>
            @for (step of c.instructions; track step) {
              <li>{{ step }}</li>
            }
          </ol>
        } @else {
          <p>Geen instructies opgegeven.</p>
        }
      </div>
    } @else {
      <p>loading...</p>
    }
  `,
  styles: `
    .detail {
      max-width: 700px;
    }
    .hero {
      width: 100%;
      max-height: 320px;
      object-fit: cover;
      border-radius: 8px;
    }
    .tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tag {
      color: var(--mat-sys-primary);
    }
    .actions {
      display: flex;
      gap: 8px;
      margin: 12px 0;
    }
  `,
})
export class CocktailDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cocktailService = inject(CocktailService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly cocktail = signal<Cocktail | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cocktailService.getOne(id).subscribe((c) => this.cocktail.set(c));
    }
  }

  label(unit: MeasureUnit): string {
    return MEASURE_LABELS[unit];
  }

  remove(cocktail: Cocktail): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Cocktail "${cocktail.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(cocktail.id).subscribe(() => {
        this.snackBar.open('Cocktail verwijderd', 'OK', { duration: 2500 });
        void this.router.navigate(['/cocktails']);
      });
    });
  }
}
