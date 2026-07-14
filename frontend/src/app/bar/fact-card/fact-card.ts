import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FACTS, factOfTheDay } from '../../core/facts';

/**
 * "Wist je dat?" card for the home sidebar. Opens on a day-seeded fact and cycles to the next
 * one on tap. Purely presentational — no dependencies beyond the static {@link FACTS} list.
 */
@Component({
  selector: 'app-fact-card',
  imports: [MatIconModule],
  template: `
    <button class="fact" type="button" (click)="next()">
      <div class="head">
        <span class="spark"><mat-icon>auto_awesome</mat-icon></span>
        <span class="eyebrow">Wist je dat?</span>
      </div>
      <p class="text">{{ text() }}</p>
      <span class="more">Nog een weetje →</span>
    </button>
  `,
  styles: `
    .fact {
      display: block;
      width: 100%;
      text-align: left;
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
      padding: 20px;
      cursor: pointer;
      font-family: var(--font-body);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .fact:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .head {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .spark {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex: none;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .spark mat-icon {
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
    .text {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1.0625rem;
      line-height: 1.4;
      letter-spacing: -0.01em;
      margin: 12px 0 0;
      text-wrap: pretty;
    }
    .more {
      display: inline-block;
      margin-top: 12px;
      font: 600 0.75rem var(--font-body);
      color: var(--accent);
    }
  `,
})
export class FactCard {
  private readonly index = signal(factOfTheDay());
  readonly text = () => FACTS[this.index()];

  next(): void {
    this.index.update((i) => (i + 1) % FACTS.length);
  }
}
