import { DOCUMENT } from '@angular/common';
import { Component, type ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DRINK_FAMILY_LABELS, type DrinkFamily } from '@cocktailapp/shared';
import { encode } from 'uqr';
import { LanguageService } from '../core/language.service';
import { MakeableStore } from '../core/makeable.store';
import { GlassArt } from '../shared/glass-art/glass-art';
import { glassSpecFor } from '../shared/cocktail-visual';
import { MENU_LONG, MENU_TITLE_MAX, buildMenuUrl, groupByFamily, menuKey } from './menu-link';
import type { Cocktail } from '@cocktailapp/shared';

/** One drink the bar can make, as the host ticks it. */
interface HostItem {
  key: string;
  cocktail: Cocktail;
  variationKey?: string;
  parentName?: string;
}

/** Modules of white around the code: the quiet zone scanners need to find it. */
const QUIET = 4;

/**
 * The QR code as one SVG path: a run of dark modules in a row is one rectangle. Black on white
 * whatever the theme, because some scanners cannot read an inverted code; the SVG scales without
 * blurring, so the code stays crisp at any size.
 */
export function qrPath(text: string): { size: number; d: string } {
  // L is enough for a code read off a bright screen; boostEcc raises it for free when the version
  // has room to spare.
  const { data, size } = encode(text, { ecc: 'L', boostEcc: true, border: 0 });
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y][x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y][x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return { size, d };
}

/**
 * The host's side of the guest menu, `/bar/gastenmenu` (see docs/plans/gastenmenu.md).
 *
 * Everything the bar can make right now, variations included, pre-ticked and grouped by family.
 * The host unticks what they will not make tonight, optionally names the menu, and gets a QR code
 * plus the link. The choice lives only in that link: nothing is saved, so there is nothing to sync
 * or clean up after the party.
 *
 * The QR library (`uqr`) is imported here only, so it ships in this route's lazy chunk.
 */
@Component({
  selector: 'app-menu-host',
  imports: [RouterLink, MatIconModule, GlassArt],
  template: `
    <div class="page">
      <a class="back" routerLink="/bar">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        {{ g().backToBar }}
      </a>
      <header class="head">
        <h1>{{ g().hostTitle }}</h1>
        <p class="lede">{{ g().hostIntro }}</p>
      </header>

      @if (store.loading()) {
        <div class="skeleton sk-panel"></div>
      } @else if (!items().length) {
        <div class="nudge">
          <span class="nudge-icon"><mat-icon aria-hidden="true">shelves</mat-icon></span>
          <div>
            <strong>{{ g().hostEmptyTitle }}</strong>
            <p>{{ g().hostEmptyBody }}</p>
            <a class="btn btn-primary" routerLink="/bar/ingredienten">{{ g().hostEmptyCta }}</a>
          </div>
        </div>
      } @else {
        <div class="layout">
          <section class="panel" [attr.aria-label]="g().qrLabel">
            <label class="field">
              <span class="field-label">{{ g().titleLabel }}</span>
              <input
                type="text"
                [maxLength]="titleMax"
                [placeholder]="g().defaultTitle"
                [value]="title()"
                (input)="title.set($any($event.target).value)"
                autocomplete="off"
              />
            </label>

            @if (tickedKeys().length) {
              <div class="qr">
                <svg
                  role="img"
                  [attr.aria-label]="g().qrLabel"
                  [attr.viewBox]="viewBox()"
                  shape-rendering="crispEdges"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    [attr.x]="-quiet"
                    [attr.y]="-quiet"
                    width="100%"
                    height="100%"
                    fill="#fff"
                  />
                  <path [attr.d]="qr().d" fill="#000" />
                </svg>
              </div>
              <p class="hint">{{ g().scanHint }}</p>
              @if (tickedKeys().length > menuLong) {
                <p class="hint long">
                  <mat-icon aria-hidden="true">info</mat-icon>
                  {{ g().longHint }}
                </p>
              }

              <label class="field">
                <span class="field-label">{{ g().linkLabel }}</span>
                <input
                  #link
                  class="link"
                  type="text"
                  readonly
                  [value]="url()"
                  (focus)="link.select()"
                />
              </label>
              <div class="actions">
                <button type="button" class="btn btn-primary" (click)="copy()">
                  <mat-icon aria-hidden="true">{{
                    copyState() === 'done' ? 'check' : 'content_copy'
                  }}</mat-icon>
                  {{ copyState() === 'done' ? g().copied : g().copy }}
                </button>
                @if (canShare) {
                  <button type="button" class="btn btn-ghost" (click)="share()">
                    <mat-icon aria-hidden="true">ios_share</mat-icon>
                    {{ g().share }}
                  </button>
                }
                <a class="btn btn-ghost" [href]="url()" target="_blank" rel="noopener">
                  <mat-icon aria-hidden="true">open_in_new</mat-icon>
                  {{ g().preview }}
                </a>
              </div>
              @if (copyState() === 'manual') {
                <p class="hint" role="status">{{ g().copyManual }}</p>
              }
            } @else {
              <p class="none">{{ g().noneTicked }}</p>
            }
          </section>

          <section class="pick" [attr.aria-label]="g().pickLabel">
            <div class="pick-head">
              <span class="tally">{{ g().onMenu(tickedKeys().length, items().length) }}</span>
              <button type="button" class="link-btn" (click)="toggleAll()">
                {{ allTicked() ? g().untickAll : g().tickAll }}
              </button>
            </div>
            @for (s of sections(); track s.family) {
              <fieldset class="family">
                <legend class="fam">{{ familyLabel(s.family) }}</legend>
                <div class="rows">
                  @for (it of s.items; track it.key) {
                    <label class="row" [class.off]="excluded().has(it.key)">
                      <input
                        type="checkbox"
                        [checked]="!excluded().has(it.key)"
                        (change)="toggle(it.key)"
                      />
                      <span class="glass" aria-hidden="true">
                        <app-glass-art [spec]="spec(it)" />
                      </span>
                      <span class="text">
                        <span class="name">{{ it.cocktail.name }}</span>
                        @if (it.parentName) {
                          <span class="of">{{ lang.t().common.variationOf(it.parentName) }}</span>
                        }
                      </span>
                    </label>
                  }
                </div>
              </fieldset>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      padding-top: 28px;
      padding-bottom: 24px;
      animation: rise 0.45s ease both;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 600 0.813rem var(--font-body);
      color: var(--muted);
    }
    .back:hover {
      color: var(--accent);
    }
    .back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .head {
      border-bottom: 2px solid var(--ink);
      padding: 14px 0 16px;
    }
    .head h1 {
      font-size: var(--step-4);
      letter-spacing: -0.025em;
      margin: 0;
    }
    .lede {
      margin: 10px 0 0;
      color: var(--muted);
      max-width: 60ch;
    }
    .sk-panel {
      height: 420px;
      margin-top: 24px;
      border-radius: var(--radius-lg);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
      gap: 40px;
      align-items: start;
      margin-top: 28px;
    }
    .panel {
      grid-column: 2;
      grid-row: 1;
      position: sticky;
      top: 88px;
      display: grid;
      gap: 14px;
      padding: var(--sp-5);
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-lg);
    }
    .pick {
      grid-column: 1;
      grid-row: 1;
    }

    .field {
      display: grid;
      gap: 6px;
    }
    .field-label {
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--dim);
    }
    .field input {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 14px;
      border: 1px solid var(--hairline);
      border-radius: 12px;
      background: var(--bg);
      color: var(--ink);
      font: 500 1rem var(--font-body);
    }
    .field input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .field input.link {
      font-size: 0.813rem;
      color: var(--muted);
      text-overflow: ellipsis;
    }

    /* Always black on white, also in the dark theme: scanners dislike inverted codes. */
    .qr {
      background: #fff;
      border-radius: 12px;
      border: 1px solid var(--hairline);
      overflow: hidden;
      line-height: 0;
    }
    .qr svg {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 1;
    }
    .hint {
      margin: 0;
      font-size: var(--step--1);
      color: var(--muted);
    }
    .hint.long {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      color: var(--warn);
    }
    .hint.long mat-icon {
      flex: none;
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-top: 1px;
    }
    .none {
      margin: 0;
      padding: 32px 8px;
      text-align: center;
      color: var(--muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: var(--radius-pill);
      padding: 11px 18px;
      font: 600 0.875rem var(--font-body);
      cursor: pointer;
      border: 1.5px solid transparent;
      background: none;
      color: inherit;
    }
    .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .btn-primary {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .btn-ghost {
      border-color: color-mix(in srgb, var(--ink) 20%, transparent);
      color: var(--muted);
    }
    .btn-ghost:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .pick-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .tally {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.25rem;
      color: var(--ok);
    }
    .link-btn {
      border: 0;
      background: none;
      padding: 4px 0;
      font: 600 0.813rem var(--font-body);
      color: var(--accent);
      cursor: pointer;
    }
    .family {
      border: 0;
      margin: 22px 0 0;
      padding: 0;
      min-width: 0;
    }
    .fam {
      padding: 0;
      margin-bottom: 10px;
      font: 600 0.688rem var(--font-body);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--dim);
    }
    .rows {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px 8px 12px;
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      cursor: pointer;
      transition:
        opacity 0.15s ease,
        border-color 0.15s ease;
    }
    .row:hover {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--hairline));
    }
    .row.off {
      opacity: 0.55;
    }
    .row input {
      flex: none;
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .glass {
      flex: none;
      width: 34px;
      height: 42px;
    }
    .text {
      min-width: 0;
      display: grid;
    }
    .name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1rem;
      line-height: 1.2;
    }
    .of {
      font: 600 0.75rem var(--font-body);
      color: var(--faint);
    }

    .nudge {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      margin-top: 24px;
      padding: var(--sp-6);
      background: var(--surface);
      border: 1px solid var(--hairline-soft);
      border-radius: var(--radius-lg);
    }
    .nudge-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .nudge strong {
      font-family: var(--font-display);
      font-size: 1.25rem;
    }
    .nudge p {
      margin: 6px 0 18px;
      color: var(--muted);
      max-width: 52ch;
    }

    @media (max-width: 900px) {
      /* On a phone the code comes first: it is what goes on the table. */
      .layout {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
      }
      .panel,
      .pick {
        grid-column: 1;
        grid-row: auto;
      }
      .panel {
        position: static;
        padding: var(--sp-4);
      }
      .rows {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 520px) {
      .nudge {
        flex-direction: column;
        padding: var(--sp-5);
      }
    }
  `,
})
export class MenuHost {
  protected readonly store = inject(MakeableStore);
  protected readonly lang = inject(LanguageService);
  private readonly document = inject(DOCUMENT);

  protected readonly titleMax = MENU_TITLE_MAX;
  protected readonly menuLong = MENU_LONG;
  protected readonly quiet = QUIET;
  protected readonly canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  protected readonly g = computed(() => this.lang.t().guestMenu);

  readonly title = signal('');
  /**
   * What the host unticked. Stored as exclusions rather than a selection, so everything the bar
   * can make starts ticked, and a drink that becomes makeable later is ticked too.
   */
  readonly excluded = signal<ReadonlySet<string>>(new Set());
  readonly copyState = signal<'idle' | 'done' | 'manual'>('idle');
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('link');

  readonly items = computed<HostItem[]>(() =>
    this.store.makeable().map((r) => ({
      key: menuKey(r.cocktail.id, r.variation?.key),
      cocktail: r.cocktail,
      variationKey: r.variation?.key,
      parentName: r.parentName,
    })),
  );
  readonly sections = computed(() => groupByFamily(this.items(), this.lang.locale()));

  /** Ticked keys in menu order (family, then name), so the link reads like the menu. */
  readonly tickedKeys = computed(() => {
    const off = this.excluded();
    return this.sections().flatMap((s) => s.items.map((i) => i.key).filter((k) => !off.has(k)));
  });
  readonly allTicked = computed(() => this.tickedKeys().length === this.items().length);

  readonly url = computed(() =>
    buildMenuUrl(this.document.location.origin, this.title(), this.tickedKeys()),
  );
  readonly qr = computed(() => qrPath(this.url()));
  readonly viewBox = computed(() => {
    const s = this.qr().size + 2 * QUIET;
    return `${-QUIET} ${-QUIET} ${s} ${s}`;
  });

  familyLabel(f: DrinkFamily | null): string {
    return f ? DRINK_FAMILY_LABELS[this.lang.locale()][f] : this.g().other;
  }

  spec(it: HostItem) {
    return glassSpecFor(it.cocktail, 'card', 'none', it.variationKey);
  }

  toggle(key: string): void {
    const next = new Set(this.excluded());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.excluded.set(next);
  }

  toggleAll(): void {
    this.excluded.set(this.allTicked() ? new Set(this.items().map((i) => i.key)) : new Set());
  }

  /**
   * The box serves plain http, where `navigator.clipboard` does not exist. Fall back to the old
   * copy command on the selected link, and if even that is refused, leave the link selected and
   * say so.
   */
  async copy(): Promise<void> {
    const url = this.url();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }
    const input = this.linkInput()?.nativeElement;
    if (!ok && input) {
      input.focus();
      input.select();
      try {
        ok = this.document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    this.copyState.set(ok ? 'done' : 'manual');
    clearTimeout(this.copyTimer);
    if (ok) this.copyTimer = setTimeout(() => this.copyState.set('idle'), 2500);
  }

  async share(): Promise<void> {
    try {
      await navigator.share({
        title: this.title().trim() || this.g().defaultTitle,
        url: this.url(),
      });
    } catch {
      /* dismissed, or not allowed here: nothing to do */
    }
  }
}
