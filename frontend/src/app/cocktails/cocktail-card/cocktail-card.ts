import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  type Cocktail,
  type CocktailVariation,
  GLASSWARE_LABELS,
  type MakeableResult,
  METHOD_LABELS,
} from '@cocktailapp/shared';
import { FavoritesService } from '../../core/favorites.service';
import { LanguageService } from '../../core/language.service';
import { GlassArt } from '../../shared/glass-art/glass-art';
import { glassSpecFor, tintFor } from '../../shared/cocktail-visual';
import { inSentence } from '../../shared/in-sentence';

/**
 * The own ingredient a makeable result leans on, as it reads in a sentence ("jenever"), or null
 * when every line is covered by its own base. A card names one, which is the common case and keeps
 * the line short.
 */
export function viaName(result: Pick<MakeableResult, 'substitutions'>): string | null {
  const via = result.substitutions?.[0]?.via[0];
  return via ? inSentence(via) : null;
}

/** Presentational cocktail card with the hand-drawn glass on a tinted panel. */
@Component({
  selector: 'app-cocktail-card',
  imports: [RouterLink, MatIconModule, GlassArt],
  template: `
    <article class="card">
      <a class="media" [style.background]="tint()" [routerLink]="['/cocktails', cocktail().id]"
        [queryParams]="query()" [attr.aria-label]="cocktail().name" draggable="false">
        <div class="glass"><app-glass-art [spec]="spec()" /></div>
        <!-- A variation has no id of its own to store, so it cannot be a favourite. -->
        @if (!variation()) {
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
        }
      </a>

      <div class="body">
        <h3 class="name">
          <a [routerLink]="['/cocktails', cocktail().id]" [queryParams]="query()" draggable="false">{{ cocktail().name }}</a>
        </h3>
        @if (showStatus() && missingCount() !== null) {
          <div class="status">
            <span class="dot" [style.background]="statusColor()"></span>
            <span class="label">{{ statusLabel() }}</span>
          </div>
        } @else {
          <div class="meta">{{ meta() }}</div>
          @if (via(); as name) {
            <div class="via">{{ lang.t().card.withIngredient(name) }}</div>
          }
        }
        <div class="actions"><ng-content /></div>
      </div>
    </article>
  `,
  styles: `
    /* The card sizes itself to its own width, not the viewport's: on a phone the grids put two
       side by side, and the compact rules at the bottom take over below ~220px. */
    :host {
      display: block;
      min-width: 0;
      container-type: inline-size;
    }
    .card {
      height: 100%;
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
    /* The card's rounding comes from overflow: hidden, but a long press highlights (and would drag)
       the link element itself — so the link carries the same top corners, or that shade is square. */
    .media {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
      border-radius: calc(var(--radius-lg) - 1px) calc(var(--radius-lg) - 1px) 0 0;
      -webkit-user-drag: none;
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
    .via {
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
    @container (max-width: 220px) {
      .media {
        height: 124px;
      }
      .glass {
        height: 100px;
        width: 80px;
      }
      .fav {
        top: 8px;
        right: 8px;
      }
      .body {
        gap: 4px;
        padding: 10px 12px 12px;
      }
      .name {
        font-size: 1.02rem;
        line-height: 1.2;
        /* Hyphenate long single words at a real syllable ("Aardbeien-limonade"), following the
           <html lang> the language toggle sets; break-word is only the last resort. */
        hyphens: auto;
        overflow-wrap: break-word;
      }
      .status {
        align-items: flex-start;
      }
      .status .dot {
        margin-top: 4px;
      }
      .status .label {
        font-size: 0.7rem;
        line-height: 1.35;
      }
      .meta {
        font-size: 0.625rem;
        letter-spacing: 0.04em;
      }
      .via {
        font-size: 0.7rem;
        line-height: 1.35;
      }
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
  /**
   * Set when `cocktail` is a variation's recipe (carrying its parent's id): the card then links to
   * the parent's page opened on this variation, and its meta line names the parent.
   */
  readonly variation = input<CocktailVariation | null>(null);
  readonly parentName = input<string | null>(null);
  /**
   * The own ingredient standing in for a recipe line, already as it reads in a sentence ("jenever").
   * Added to "Nu te maken"; on a card without a status it gets a quiet line of its own.
   */
  readonly via = input<string | null>(null);

  readonly query = computed(() => {
    const v = this.variation();
    return v ? { variation: v.key } : null;
  });
  readonly spec = computed(() =>
    glassSpecFor(this.cocktail(), 'card', 'ambient', this.variation()?.key),
  );
  readonly tint = computed(() => tintFor(this.cocktail()));
  readonly isFav = computed(() => this.favorites.has(this.cocktail().id));

  readonly meta = computed(() => {
    const parent = this.parentName();
    if (this.variation() && parent) return this.lang.t().common.variationOf(parent);
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
    if (m === 0) {
      const via = this.via();
      return via ? t.makeNowWith(via) : t.makeNow;
    }
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
