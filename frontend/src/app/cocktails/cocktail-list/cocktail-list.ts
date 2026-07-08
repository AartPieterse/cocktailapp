import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Cocktail } from '@cocktailapp/shared';
import { catchError, combineLatest, debounceTime, of, startWith, switchMap, tap } from 'rxjs';
import { FavoritesService } from '../../core/favorites.service';
import { CocktailService } from '../../services/cocktail.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CocktailCard } from '../cocktail-card/cocktail-card';

@Component({
  selector: 'app-cocktail-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CocktailCard,
  ],
  template: `
    <header class="head">
      <div>
        <p class="eyebrow">De collectie</p>
        <h1>Cocktails</h1>
      </div>
      <a mat-flat-button routerLink="/cocktails/add"><mat-icon>add</mat-icon> Nieuwe cocktail</a>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="search" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Zoek op naam</mat-label>
        <input matInput [formControl]="searchCtrl" autocomplete="off" />
        @if (searchCtrl.value) {
          <button matSuffix mat-icon-button (click)="searchCtrl.setValue('')" aria-label="Wis">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      <button
        class="fav-toggle"
        mat-stroked-button
        [class.on]="onlyFavs()"
        (click)="onlyFavs.update((v) => !v)"
      >
        <mat-icon>{{ onlyFavs() ? 'favorite' : 'favorite_border' }}</mat-icon>
        Favorieten
      </button>
    </div>

    @if (tags().length) {
      <div class="tags">
        <button class="tag" [class.on]="!activeTag()" (click)="setTag(null)">Alles</button>
        @for (t of tags(); track t) {
          <button class="tag" [class.on]="activeTag() === t" (click)="setTag(t)">#{{ t }}</button>
        }
      </div>
    }

    @if (loading()) {
      <div class="card-grid">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div>
            <div class="skeleton sk-media"></div>
            <div class="skeleton sk-line"></div>
            <div class="skeleton sk-line short"></div>
          </div>
        }
      </div>
    } @else if (visible().length) {
      <p class="result-count muted">{{ visible().length }} resultaten</p>
      <div class="card-grid">
        @for (c of visible(); track c.id) {
          <app-cocktail-card [cocktail]="c">
            <a mat-button [routerLink]="['/cocktails', c.id, 'edit']">Bewerk</a>
            <button mat-button (click)="remove(c)">Verwijder</button>
          </app-cocktail-card>
        }
      </div>
    } @else {
      <div class="empty">
        <mat-icon>search_off</mat-icon>
        <h3>Niets gevonden</h3>
        <p class="muted">
          @if (onlyFavs()) {
            Je hebt nog geen favorieten. Tik op het hartje van een cocktail.
          } @else {
            Pas je zoekopdracht aan of
            <a routerLink="/cocktails/add">voeg een nieuwe cocktail toe</a>.
          }
        </p>
      </div>
    }
  `,
  styles: `
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--sp-4);
      flex-wrap: wrap;
      margin-bottom: var(--sp-5);
    }
    .head h1 {
      margin: 0;
    }
    .toolbar {
      display: flex;
      gap: var(--sp-3);
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: var(--sp-4);
    }
    .search {
      flex: 1;
      min-width: 240px;
    }
    .fav-toggle.on {
      color: var(--accent);
      border-color: var(--accent);
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin-bottom: var(--sp-5);
    }
    .tag {
      border: 1px solid var(--hairline);
      background: var(--surface);
      color: var(--muted);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: var(--step--1);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.14s ease;
    }
    .tag:hover {
      border-color: var(--accent);
      color: var(--ink);
    }
    .tag.on {
      background: var(--ink);
      color: var(--bg);
      border-color: var(--ink);
    }
    .result-count {
      font-size: var(--step--1);
      margin-bottom: var(--sp-3);
    }
    .sk-media {
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-lg);
      margin-bottom: var(--sp-3);
    }
    .sk-line {
      height: 14px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .sk-line.short {
      width: 55%;
    }
    .empty {
      text-align: center;
      padding: var(--sp-8) var(--sp-4);
      color: var(--muted);
    }
    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--faint);
    }
    .empty a {
      color: var(--accent);
    }
  `,
})
export class CocktailList {
  private readonly cocktailService = inject(CocktailService);
  private readonly favorites = inject(FavoritesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly activeTag = signal<string | null>(this.route.snapshot.queryParamMap.get('tag'));
  readonly onlyFavs = signal(false);
  readonly loading = signal(true);
  readonly cocktails = signal<Cocktail[]>([]);
  readonly tags = signal<string[]>([]);
  private readonly reload = signal(0);

  readonly visible = computed(() => {
    const list = this.cocktails();
    return this.onlyFavs() ? list.filter((c) => this.favorites.has(c.id)) : list;
  });

  private readonly query = toSignal(
    this.searchCtrl.valueChanges.pipe(debounceTime(250), startWith(this.searchCtrl.value)),
    { initialValue: '' },
  );

  constructor() {
    combineLatest([
      toObservable(this.query),
      toObservable(this.activeTag),
      toObservable(this.reload),
    ])
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(([q, tag]) =>
          this.cocktailService
            .getAll(q || undefined, tag || undefined)
            .pipe(catchError(() => of<Cocktail[]>([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (list) => {
          this.cocktails.set(list);
          // Capture the universe of tags from the first unfiltered load.
          if (!this.tags().length && !this.activeTag() && !this.query()) {
            const set = new Set<string>();
            for (const c of list) for (const t of c.tags ?? []) set.add(t);
            this.tags.set([...set].sort());
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  setTag(tag: string | null): void {
    this.activeTag.set(tag);
  }

  remove(cocktail: Cocktail): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Cocktail "${cocktail.name}" verwijderen?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.cocktailService.remove(cocktail.id).subscribe(() => {
        this.snackBar.open('Cocktail verwijderd', 'OK', { duration: 2500 });
        this.reload.update((v) => v + 1);
      });
    });
  }
}
