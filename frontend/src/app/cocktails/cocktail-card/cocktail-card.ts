import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { type Cocktail, GLASSWARE_LABELS, METHOD_LABELS } from '@cocktailapp/shared';
import { FavoritesService } from '../../core/favorites.service';
import { CocktailThumb } from '../../shared/cocktail-thumb/cocktail-thumb';

/** Presentational cocktail card. Extra action buttons can be projected via <ng-content>. */
@Component({
  selector: 'app-cocktail-card',
  imports: [RouterLink, MatIconModule, CocktailThumb],
  template: `
    <article class="card">
      <a class="media" [routerLink]="['/cocktails', cocktail().id]" [attr.aria-label]="cocktail().name">
        <app-cocktail-thumb [name]="cocktail().name" [imageUrl]="cocktail().imageUrl" />
        @if (missingCount() !== null) {
          @if (missingCount() === 0) {
            <span class="badge badge--ok"><mat-icon>check</mat-icon> Nu te maken</span>
          } @else {
            <span class="badge badge--miss">mist {{ missingCount() }}</span>
          }
        }
        <button
          class="fav"
          type="button"
          (click)="toggleFav($event)"
          [attr.aria-pressed]="isFav()"
          [attr.aria-label]="isFav() ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'"
        >
          <mat-icon>{{ isFav() ? 'favorite' : 'favorite_border' }}</mat-icon>
        </button>
      </a>

      <div class="body">
        <div class="meta">
          @if (cocktail().method) {
            <span>{{ methodLabel() }}</span>
          }
          @if (cocktail().glass) {
            <span class="dot">·</span><span>{{ glassLabel() }}</span>
          }
        </div>
        <h3 class="name">
          <a [routerLink]="['/cocktails', cocktail().id]">{{ cocktail().name }}</a>
        </h3>
        @if (missingCount() && missingNames().length) {
          <p class="missing">Je mist: {{ missingNames().join(', ') }}</p>
        } @else {
          <p class="summary">{{ summary() }}</p>
        }
        <div class="actions">
          <ng-content />
        </div>
      </div>
    </article>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow);
      border-color: color-mix(in srgb, var(--accent) 30%, var(--hairline));
    }
    .media {
      position: relative;
      display: block;
    }
    .badge {
      position: absolute;
      top: 10px;
      left: 10px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      backdrop-filter: blur(4px);
    }
    .badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .badge--ok {
      background: var(--ok);
      color: #fff;
    }
    .badge--miss {
      background: color-mix(in srgb, var(--ink) 72%, transparent);
      color: #fff;
    }
    .fav {
      position: absolute;
      top: 8px;
      right: 8px;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      background: color-mix(in srgb, var(--surface) 80%, transparent);
      backdrop-filter: blur(4px);
      color: var(--accent);
    }
    .fav mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .fav:hover {
      background: var(--surface);
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: var(--sp-4);
      flex: 1;
    }
    .meta {
      font-size: var(--step--1);
      color: var(--faint);
      letter-spacing: 0.02em;
    }
    .meta .dot {
      margin: 0 5px;
    }
    .name {
      font-size: var(--step-2);
      margin: 0;
    }
    .name a:hover {
      color: var(--accent);
    }
    .summary,
    .missing {
      font-size: var(--step--1);
      color: var(--muted);
      margin: 2px 0 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .missing {
      color: var(--accent);
      font-weight: 500;
    }
    .actions {
      margin-top: auto;
      padding-top: var(--sp-3);
      display: flex;
      gap: var(--sp-1);
      flex-wrap: wrap;
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class CocktailCard {
  private readonly favorites = inject(FavoritesService);

  readonly cocktail = input.required<Cocktail>();
  /** null = no availability context; 0 = makeable now; >0 = missing that many. */
  readonly missingCount = input<number | null>(null);
  readonly missingNames = input<string[]>([]);

  readonly isFav = computed(() => this.favorites.has(this.cocktail().id));
  readonly methodLabel = computed(() => {
    const m = this.cocktail().method;
    return m ? METHOD_LABELS[m] : '';
  });
  readonly glassLabel = computed(() => {
    const g = this.cocktail().glass;
    return g ? GLASSWARE_LABELS[g] : '';
  });
  readonly summary = computed(() =>
    this.cocktail()
      .ingredients.map((i) => i.name)
      .join(' · '),
  );

  toggleFav(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.cocktail().id);
  }
}
