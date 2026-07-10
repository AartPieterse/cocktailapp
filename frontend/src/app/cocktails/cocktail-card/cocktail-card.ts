import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { type Cocktail, GLASSWARE_LABELS, METHOD_LABELS } from '@cocktailapp/shared';
import { FavoritesService } from '../../core/favorites.service';
import { LanguageService } from '../../core/language.service';
import { GlassArt } from '../../shared/glass-art/glass-art';
import { glassSpecFor, tintFor } from '../../shared/cocktail-visual';

/** Presentational cocktail card with the hand-drawn glass on a tinted panel. */
@Component({
  selector: 'app-cocktail-card',
  imports: [RouterLink, MatIconModule, GlassArt],
  template: `
    <article class="card">
      <a class="media" [style.background]="tint()" [routerLink]="['/cocktails', cocktail().id]"
        [attr.aria-label]="cocktail().name">
        <div class="glass"><app-glass-art [spec]="spec()" /></div>
        <button
          class="fav"
          type="button"
          (click)="toggleFav($event)"
          [class.on]="isFav()"
          [attr.aria-pressed]="isFav()"
          [attr.aria-label]="isFav() ? lang.t().card.removeFavorite : lang.t().card.addFavorite"
        >
          <mat-icon>{{ isFav() ? 'favorite' : 'favorite_border' }}</mat-icon>
        </button>
      </a>

      <div class="body">
        <h3 class="name">
          <a [routerLink]="['/cocktails', cocktail().id]">{{ cocktail().name }}</a>
        </h3>
        @if (showStatus()) {
          <div class="status">
            <span class="dot" [style.background]="statusColor()"></span>
            <span class="label">{{ statusLabel() }}</span>
          </div>
        } @else {
          <div class="meta">{{ meta() }}</div>
        }
        <div class="actions"><ng-content /></div>
      </div>
    </article>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow);
    }
    .media {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
    }
    .glass {
      height: 120px;
      width: 96px;
    }
    .fav {
      position: absolute;
      top: 10px;
      right: 10px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      background: color-mix(in srgb, var(--surface) 78%, transparent);
      backdrop-filter: blur(4px);
      color: var(--accent);
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .card:hover .fav,
    .fav.on {
      opacity: 1;
    }
    /* Touch devices have no hover — always show the favourite control. */
    @media (hover: none) {
      .fav {
        opacity: 1;
      }
    }
    .fav mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 16px 16px 18px;
      flex: 1;
    }
    .name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.24rem;
      letter-spacing: -0.01em;
      margin: 0;
    }
    .name a:hover {
      color: var(--accent);
    }
    .meta {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.05em;
      color: var(--faint);
      text-transform: uppercase;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: none;
    }
    .status .label {
      font: 500 0.75rem var(--font-body);
      color: var(--faint);
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
  protected readonly lang = inject(LanguageService);

  readonly cocktail = input.required<Cocktail>();
  /** null = no availability context; 0 = makeable now; >0 = missing that many. */
  readonly missingCount = input<number | null>(null);
  readonly missingNames = input<string[]>([]);
  /** Show a coloured availability dot instead of the glass · method meta line. */
  readonly showStatus = input(false);

  readonly spec = computed(() => glassSpecFor(this.cocktail()));
  readonly tint = computed(() => tintFor(this.cocktail()));
  readonly isFav = computed(() => this.favorites.has(this.cocktail().id));

  readonly meta = computed(() => {
    const c = this.cocktail();
    const locale = this.lang.locale();
    const parts: string[] = [];
    if (c.glass) parts.push(GLASSWARE_LABELS[locale][c.glass]);
    if (c.method) parts.push(METHOD_LABELS[locale][c.method]);
    return parts.join(' · ');
  });

  readonly statusColor = computed(() => {
    const m = this.missingCount();
    if (m === 0) return 'var(--ok)';
    if (m === 1) return 'var(--warn)';
    return 'var(--dim)';
  });
  readonly statusLabel = computed(() => {
    const m = this.missingCount();
    if (m === null) return this.meta();
    const t = this.lang.t().card;
    if (m === 0) return t.makeNow;
    const names = this.missingNames();
    if (m === 1) return names.length ? t.missName(names[0]) : t.missMany(1);
    return t.missMany(m);
  });

  toggleFav(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.cocktail().id);
  }
}
