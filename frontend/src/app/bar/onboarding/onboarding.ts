import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import type { Cocktail } from '@cocktailapp/shared';
import { catchError, of } from 'rxjs';
import { LanguageService } from '../../core/language.service';
import { CocktailService } from '../../services/cocktail.service';
import { CocktailCard } from '../../cocktails/cocktail-card/cocktail-card';
import { GlassArt } from '../../shared/glass-art/glass-art';
import { glassSpecFor } from '../../shared/cocktail-visual';
import { LearnRow } from '../learn-row/learn-row';

/** Three drinks that read as three different glasses, side by side in the hero. */
const HERO_IDS = ['margarita', 'espresso-martini', 'mojito'];
/** A first look at the menu: a sour, a stirred drink, a sparkling one and a zero-proof peer. */
const CLASSIC_IDS = ['daiquiri', 'old-fashioned', 'french-75', 'virgin-mojito'];

/**
 * The home screen before the bar holds anything. It explains the app in three steps and then
 * shows the menu and the lessons, so someone who skips the wizard still has somewhere to go.
 */
@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, MatIconModule, CocktailCard, GlassArt, LearnRow],
  template: `
    <section class="hero">
      <div class="copy">
        <p class="eyebrow">{{ lang.t().home.welcome }}</p>
        <h1 class="title" [innerHTML]="lang.t().home.heroTitle"></h1>
        <p class="lede" [innerHTML]="lang.t().home.heroLede"></p>
        <div class="cta">
          <a class="btn btn-primary" routerLink="/bar/wizard">{{ lang.t().home.buildBar }}</a>
          <a class="btn btn-ghost" routerLink="/cocktails">{{ lang.t().home.browseFirst }}</a>
        </div>
      </div>
      <div class="glasses" aria-hidden="true">
        @for (c of heroDrinks(); track c.id; let i = $index) {
          <div class="floaty" [style.animation-delay]="i * 0.7 + 's'">
            <app-glass-art [spec]="heroSpec(c)" />
          </div>
        }
      </div>
    </section>

    <section class="how">
      <h2 class="sr">{{ lang.t().home.howTitle }}</h2>
      <ol>
        @for (s of lang.t().home.howSteps; track s.title; let i = $index) {
          <li>
            <span class="num">{{ i + 1 }}</span>
            <div>
              <h3>{{ s.title }}</h3>
              <p>{{ s.body }}</p>
            </div>
          </li>
        }
      </ol>
    </section>

    @if (classics().length) {
      <section class="classics">
        <div class="section-head">
          <h2>{{ lang.t().home.classicsTitle }}</h2>
          <a class="all" routerLink="/cocktails">
            {{ lang.t().nav.cocktails }} <mat-icon>arrow_forward</mat-icon>
          </a>
        </div>
        <div class="grid">
          @for (c of classics(); track c.id) {
            <app-cocktail-card [cocktail]="c" />
          }
        </div>
      </section>
    }

    <app-learn-row />
  `,
  styles: `
    :host {
      display: block;
      padding-bottom: 56px;
      animation: rise 0.5s ease both;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 40px;
      align-items: center;
      padding: 56px 0 32px;
    }
    .eyebrow {
      font: 600 0.75rem var(--font-body);
      letter-spacing: 0.2em;
      color: var(--accent);
      text-transform: uppercase;
      margin: 0;
    }
    .title {
      font-size: var(--step-5);
      line-height: 1.02;
      letter-spacing: -0.03em;
      margin: 14px 0 18px;
    }
    .lede {
      max-width: 46ch;
      color: var(--muted);
      font-size: 1.0625rem;
      margin: 0;
    }
    .cta {
      display: flex;
      gap: 12px;
      margin-top: 28px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-pill);
      padding: 13px 24px;
      font: 600 0.875rem var(--font-body);
      border: 1.5px solid transparent;
      transition: transform 0.15s ease;
    }
    .btn:hover {
      transform: translateY(-1px);
    }
    .btn-primary {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .btn-ghost {
      border-color: color-mix(in srgb, var(--ink) 20%, transparent);
      color: var(--muted);
    }
    .glasses {
      /* Drawn straight onto the page background, so the outline flips with the theme. */
      --bk-ink: var(--ink);
      --bk-glass: color-mix(in srgb, var(--ink) 8%, transparent);
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: clamp(4px, 2vw, 12px);
    }
    .floaty {
      flex: 0 1 150px;
      min-width: 0;
      aspect-ratio: 3 / 4;
      animation: floaty 5s ease-in-out infinite;
    }
    .how ol {
      list-style: none;
      margin: 0;
      padding: 24px 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      border-top: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
    }
    .how li {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .num {
      display: grid;
      place-items: center;
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid var(--accent);
      color: var(--accent);
      font: 600 0.875rem var(--font-display);
    }
    .how h3 {
      font-size: 1.125rem;
      margin: 4px 0 4px;
    }
    .how p {
      margin: 0;
      color: var(--muted);
      font-size: 0.938rem;
      line-height: 1.5;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .classics {
      margin-top: 56px;
    }
    .section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 12px;
    }
    .section-head h2 {
      font-size: 1.62rem;
      margin: 0;
    }
    .all {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex: none;
      font: 600 0.813rem var(--font-body);
      color: var(--accent);
    }
    .all mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 22px;
      margin-top: 24px;
    }
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding: 32px 0 24px;
      }
      .glasses {
        order: -1;
        max-width: 360px;
        margin: 0 auto;
      }
      .how ol {
        grid-template-columns: 1fr;
        gap: 18px;
      }
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 520px) {
      .grid {
        gap: var(--sp-3);
      }
    }
  `,
})
export class Onboarding {
  protected readonly lang = inject(LanguageService);
  private readonly cocktailService = inject(CocktailService);

  private readonly menu = toSignal(
    this.cocktailService.getAll().pipe(catchError(() => of<Cocktail[]>([]))),
    { initialValue: [] as Cocktail[] },
  );

  private pick(ids: readonly string[]): Cocktail[] {
    const byId = new Map(this.menu().map((c) => [c.id, c]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  protected readonly heroDrinks = computed(() => this.pick(HERO_IDS));
  protected readonly classics = computed(() => this.pick(CLASSIC_IDS));

  protected heroSpec(c: Cocktail) {
    return glassSpecFor(c, 'hero', 'ambient');
  }
}
