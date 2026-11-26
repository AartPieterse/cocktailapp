import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import {
  type Cocktail,
  DRINK_FAMILY_ABOUT,
  DRINK_FAMILY_LABELS,
  DRINK_FAMILY_RATIO,
} from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../../core/language.service';
import { CocktailService } from '../../services/cocktail.service';
import { techniqueOfTheDay } from '../../techniek/techniques';
import { FactCard } from '../fact-card/fact-card';
import { dayIndex, familyExamples, familyOfTheDay } from '../discover';

/**
 * "Achter de bar": three things to learn that need no bottle — the technique of the day, the shape
 * of the day, and a fact. It is the reason to open the home screen that is not "what can I pour",
 * so it shows on the first run too, before the bar holds anything.
 */
@Component({
  selector: 'app-learn-row',
  imports: [RouterLink, MatIconModule, FactCard],
  template: `
    <section class="learn">
      <header class="head">
        <h2>{{ lang.t().home.learnTitle }}</h2>
        <p class="lede">{{ lang.t().home.learnLede }}</p>
      </header>

      <div class="cards">
        <a class="card" [routerLink]="['/techniek', technique.id]">
          <div class="card-head">
            <span class="badge"><mat-icon>school</mat-icon></span>
            <span class="eyebrow">{{ lang.t().home.techniqueEyebrow }}</span>
            <mat-icon class="chev" aria-hidden="true">chevron_right</mat-icon>
          </div>
          <h3>{{ lesson().title }}</h3>
          <p class="body">{{ lesson().lede }}</p>
          <p class="small">{{ lang.t().home.drillLine(lesson().drill.seconds) }}</p>
          <span class="sr-only">{{ lang.t().home.toLesson }}</span>
        </a>

        <a class="card" [routerLink]="['/families', family]">
          <div class="card-head">
            <span class="badge"><mat-icon>category</mat-icon></span>
            <span class="eyebrow">{{ lang.t().home.familyEyebrow }}</span>
            <mat-icon class="chev" aria-hidden="true">chevron_right</mat-icon>
          </div>
          <h3>{{ familyLabel() }}</h3>
          <p class="ratio">{{ familyRatio() }}</p>
          <p class="body">{{ familyAbout() }}</p>
          @if (examples().length) {
            <p class="small">{{ lang.t().home.familyExamples(examples()) }}</p>
          }
          <span class="sr-only">{{ lang.t().home.toFamily }}</span>
        </a>

        <app-fact-card />
      </div>
    </section>
  `,
  styles: `
    .learn {
      margin-top: 72px;
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 4px 24px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 12px;
    }
    .head h2 {
      font-size: 1.62rem;
      margin: 0;
    }
    .lede {
      margin: 0;
      color: var(--muted);
      font-size: var(--step--1);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 24px;
      align-items: stretch;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 20px;
      color: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .badge {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex: none;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .badge mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }
    .eyebrow {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.16em;
      color: var(--accent);
      text-transform: uppercase;
    }
    h3 {
      font-size: 1.45rem;
      margin: 6px 0 0;
    }
    .ratio {
      margin: 0;
      font-family: var(--font-display);
      font-style: italic;
      color: var(--ink);
    }
    .body {
      margin: 0;
      color: var(--muted);
      font-size: 0.938rem;
      line-height: 1.5;
      text-wrap: pretty;
    }
    .small {
      margin: 0;
      color: var(--faint);
      font-size: var(--step--1);
    }
    /* The whole card is the link; the chevron on the eyebrow's line only says so, like a list row. */
    .chev {
      margin-left: auto;
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--faint);
      transition: transform 0.15s ease, color 0.15s ease;
    }
    .card:hover .chev {
      transform: translateX(2px);
      color: var(--accent);
    }
    app-fact-card {
      display: block;
    }
    /* Read out, not shown: the chevron is decoration, the words say where the card goes. */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 900px) {
      .cards {
        grid-template-columns: 1fr;
      }
      .learn {
        margin-top: 48px;
      }
    }
  `,
})
export class LearnRow {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);

  /** What the bar makes now, so the family's examples can point at drinks the reader can pour. */
  readonly makeable = input<readonly Cocktail[]>([]);

  protected readonly technique = techniqueOfTheDay(new Date());
  protected readonly family = familyOfTheDay(dayIndex());

  private readonly menu = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  protected readonly lesson = computed(() => this.technique.copy[this.lang.locale()]);
  protected readonly familyLabel = computed(() => DRINK_FAMILY_LABELS[this.lang.locale()][this.family]);
  protected readonly familyRatio = computed(() => DRINK_FAMILY_RATIO[this.lang.locale()][this.family]);
  protected readonly familyAbout = computed(() => DRINK_FAMILY_ABOUT[this.lang.locale()][this.family]);
  protected readonly examples = computed(() =>
    familyExamples(this.family, this.makeable(), this.menu()).map((c) => c.name),
  );
}
