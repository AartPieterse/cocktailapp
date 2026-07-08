import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import { catchError, of, switchMap, tap } from 'rxjs';
import { CabinetService } from '../core/cabinet.service';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';
import { CocktailCard } from '../cocktails/cocktail-card/cocktail-card';

@Component({
  selector: 'app-bar',
  imports: [RouterLink, MatButtonModule, MatIconModule, CocktailCard],
  template: `
    @if (showOnboarding()) {
      <section class="onboard">
        <p class="eyebrow">Welkom bij Barkast</p>
        <h1 class="hero-title">Wat staat er<br />in jouw kast?</h1>
        <p class="lede">
          Vink aan wat je in huis hebt — sterke drank, mixers, dat ene flesje achterin —
          en Barkast laat meteen zien welke cocktails je <em>nu</em> kunt maken.
        </p>
        <div class="cta">
          <a mat-flat-button routerLink="/bar/wizard">
            <mat-icon>local_bar</mat-icon> Stel je bar samen
          </a>
          <a mat-stroked-button routerLink="/cocktails">Blader eerst rond</a>
        </div>
        <div class="steps">
          <div><span class="num">1</span> Loop door de secties</div>
          <div><span class="num">2</span> Vink je ingrediënten aan</div>
          <div><span class="num">3</span> Zie wat je kunt maken</div>
        </div>
      </section>
    } @else {
      <header class="head">
        <div>
          <p class="eyebrow">Mijn bar</p>
          @if (loading()) {
            <h1 class="count">Aan het kijken…</h1>
          } @else {
            <h1 class="count">
              Je kunt <span class="big">{{ makeableNow().length }}</span>
              {{ makeableNow().length === 1 ? 'cocktail' : 'cocktails' }} maken
            </h1>
          }
          <p class="lede">
            Met de {{ cabinet.count() }} ingrediënten in je bar.
          </p>
        </div>
        <div class="head-actions">
          <a mat-flat-button routerLink="/bar/wizard"><mat-icon>tune</mat-icon> Bewerk je bar</a>
          @if (makeableNow().length) {
            <button mat-stroked-button (click)="surpriseMe()">
              <mat-icon>casino</mat-icon> Verras me
            </button>
          }
        </div>
      </header>

      @if (selected().length) {
        <div class="cabinet">
          <span class="cabinet-label">In je bar:</span>
          @for (ing of selected(); track ing.id) {
            <span class="pill">{{ ing.name }}</span>
          }
          <a class="pill pill--accent edit" routerLink="/bar/wizard">
            <mat-icon>edit</mat-icon> wijzig
          </a>
        </div>
      }

      @if (loading()) {
        <div class="card-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton-card">
              <div class="skeleton sk-media"></div>
              <div class="skeleton sk-line"></div>
              <div class="skeleton sk-line short"></div>
            </div>
          }
        </div>
      } @else {
        @if (makeableNow().length) {
          <section class="block">
            <div class="block-head">
              <h2>Nu te maken</h2>
              <span class="pill pill--ok">{{ makeableNow().length }}</span>
            </div>
            <div class="card-grid">
              @for (r of makeableNow(); track r.cocktail.id) {
                <app-cocktail-card [cocktail]="r.cocktail" [missingCount]="0" />
              }
            </div>
          </section>
        } @else {
          <section class="nudge">
            <mat-icon>info</mat-icon>
            <div>
              <strong>Nog niks helemaal compleet.</strong>
              <p class="muted">
                Voeg een sterke drank of mixer toe en je bent er zo. Kijk hieronder wat je
                bijna kunt maken.
              </p>
              <a mat-stroked-button routerLink="/bar/wizard">Bar aanvullen</a>
            </div>
          </section>
        }

        @if (almost1().length) {
          <section class="block">
            <div class="block-head">
              <h2>Bijna — je mist er één</h2>
              <span class="pill">{{ almost1().length }}</span>
            </div>
            <div class="card-grid">
              @for (r of almost1(); track r.cocktail.id) {
                <app-cocktail-card
                  [cocktail]="r.cocktail"
                  [missingCount]="r.missingCount"
                  [missingNames]="missNames(r)"
                />
              }
            </div>
          </section>
        }

        @if (almost2().length) {
          <section class="block">
            <div class="block-head">
              <h2>Twee stapjes weg</h2>
              <span class="pill">{{ almost2().length }}</span>
            </div>
            <div class="card-grid">
              @for (r of almost2(); track r.cocktail.id) {
                <app-cocktail-card
                  [cocktail]="r.cocktail"
                  [missingCount]="r.missingCount"
                  [missingNames]="missNames(r)"
                />
              }
            </div>
          </section>
        }
      }
    }
  `,
  styles: `
    .onboard {
      max-width: 640px;
      margin: var(--sp-6) 0 var(--sp-8);
    }
    .hero-title {
      font-size: var(--step-5);
      margin: 0 0 var(--sp-4);
    }
    .cta {
      display: flex;
      gap: var(--sp-3);
      flex-wrap: wrap;
      margin: var(--sp-5) 0;
    }
    .steps {
      display: flex;
      gap: var(--sp-5);
      flex-wrap: wrap;
      margin-top: var(--sp-6);
      padding-top: var(--sp-5);
      border-top: 1px solid var(--hairline);
      color: var(--muted);
      font-size: var(--step--1);
    }
    .steps .num {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      margin-right: 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--sp-5);
      flex-wrap: wrap;
      margin-bottom: var(--sp-4);
    }
    .count {
      font-size: var(--step-4);
      margin: 0;
    }
    .count .big {
      color: var(--accent);
    }
    .head .lede {
      margin: var(--sp-2) 0 0;
    }
    .head-actions {
      display: flex;
      gap: var(--sp-2);
      flex-wrap: wrap;
    }
    .cabinet {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-4) 0;
      margin-bottom: var(--sp-4);
      border-top: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
    }
    .cabinet-label {
      font-weight: 600;
      font-size: var(--step--1);
      color: var(--muted);
      margin-right: var(--sp-1);
    }
    .edit {
      cursor: pointer;
    }
    .edit mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .block {
      margin: var(--sp-6) 0;
    }
    .block-head {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      margin-bottom: var(--sp-4);
    }
    .block-head h2 {
      margin: 0;
    }
    .nudge {
      display: flex;
      gap: var(--sp-3);
      padding: var(--sp-5);
      background: var(--surface-2);
      border-radius: var(--radius-lg);
      margin: var(--sp-5) 0;
    }
    .nudge mat-icon {
      color: var(--accent);
    }
    .nudge p {
      margin: 4px 0 var(--sp-3);
    }
    .skeleton-card,
    .skeleton .sk-media {
      /* placeholder */
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
  `,
})
export class Bar {
  protected readonly cabinet = inject(CabinetService);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly results = signal<MakeableResult[]>([]);
  private readonly ingredients = signal<Ingredient[]>([]);

  readonly showOnboarding = computed(() => this.cabinet.isEmpty() && !this.cabinet.wizardDone());

  readonly makeableNow = computed(() => this.results().filter((r) => r.missingCount === 0));
  readonly almost1 = computed(() => this.results().filter((r) => r.missingCount === 1));
  readonly almost2 = computed(() => this.results().filter((r) => r.missingCount === 2));

  private readonly byId = computed(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of this.ingredients()) map.set(ing.id, ing);
    return map;
  });
  readonly selected = computed(() => {
    const map = this.byId();
    return this.cabinet
      .ids()
      .map((id) => map.get(id))
      .filter((x): x is Ingredient => !!x)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    // Re-run the makeable search whenever the cabinet changes.
    toObservable(this.cabinet.ids)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((ids) =>
          ids.length
            ? this.cocktailService
                .makeable(ids, 2)
                .pipe(catchError(() => of<MakeableResult[]>([])))
            : of<MakeableResult[]>([]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.results.set(res);
        this.loading.set(false);
      });
  }

  missNames(r: MakeableResult): string[] {
    return r.missing.map((m) => m.name);
  }

  surpriseMe(): void {
    const pool = this.makeableNow();
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    void this.router.navigate(['/cocktails', pick.cocktail.id]);
  }
}
