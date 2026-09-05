import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Cocktail } from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../core/language.service';
import { CocktailService } from '../services/cocktail.service';
import { TECHNIQUES } from './techniques';

/**
 * The six lessons, as a way into the catalog that is not "which bottles do you own".
 *
 * The four lessons keyed to a `method` show how many recipes use them; ice and garnish carry no
 * count because they are not a method, which is the honest cost of teaching them anyway.
 */
@Component({
  selector: 'app-technique-list',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <p class="eyebrow">{{ lang.t().technique.eyebrow }}</p>
        <h1>{{ lang.t().nav.technique }}</h1>
        <p class="lede">{{ lang.t().technique.intro }}</p>
      </header>

      <div class="grid">
        @for (t of lessons(); track t.id) {
          <a class="card" [routerLink]="['/techniek', t.id]">
            <h2>{{ t.title }}</h2>
            <p class="sub">{{ t.lede }}</p>
            <span class="count">
              @if (t.count !== null) {
                {{ lang.t().technique.usedInCount(t.count) }}
              } @else {
                {{ lang.t().technique.noMethod }}
              }
            </span>
          </a>
        }
      </div>
    </div>
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 36px 0 56px;
      animation: rise 0.45s ease both;
    }
    .head {
      padding-bottom: 26px;
      border-bottom: 2px solid var(--ink);
    }
    .head h1 {
      font-size: 2.75rem;
      letter-spacing: -0.03em;
      margin: 8px 0 12px;
    }
    .lede {
      max-width: 56ch;
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      margin-top: 26px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 22px 24px;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow);
      color: inherit;
    }
    .card h2 {
      font-size: 1.5rem;
      margin: 0;
    }
    .sub {
      margin: 0;
      font-size: 0.938rem;
      color: var(--muted);
    }
    .count {
      margin-top: auto;
      padding-top: 12px;
      font: 500 0.813rem var(--font-body);
      color: var(--faint);
    }
    @media (max-width: 700px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .head h1 {
        font-size: 2rem;
      }
    }
  `,
})
export class TechniqueList {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);

  private readonly cocktails = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  protected readonly lessons = computed(() => {
    const locale = this.lang.locale();
    const all = this.cocktails();
    return TECHNIQUES.map((t) => ({
      id: t.id,
      title: t.copy[locale].title,
      lede: t.copy[locale].lede,
      count: t.method ? all.filter((c) => c.method === t.method).length : null,
    }));
  });
}
