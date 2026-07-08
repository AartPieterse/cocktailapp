import { Component, computed, effect, input, signal } from '@angular/core';

/**
 * Cocktail image with a graceful, on-brand fallback: when there is no imageUrl
 * (or it fails to load) we render a duotone monogram tile keyed to the name, so
 * the grid never shows broken images or empty holes.
 */
@Component({
  selector: 'app-cocktail-thumb',
  template: `
    @if (showImage()) {
      <img class="img" [src]="imageUrl()" [alt]="name()" (error)="failed.set(true)" />
    } @else {
      <div class="ph" [attr.data-tone]="tone()">
        <span class="mono">{{ initial() }}</span>
        <span class="glyph" aria-hidden="true">🍸</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: var(--thumb-ratio, 4 / 3);
      overflow: hidden;
      background: var(--surface-2);
    }
    .img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ph {
      width: 100%;
      height: 100%;
      position: relative;
      display: grid;
      place-items: center;
    }
    .mono {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(3rem, 9vw, 5.5rem);
      color: rgba(255, 255, 255, 0.92);
      line-height: 1;
      z-index: 1;
    }
    .glyph {
      position: absolute;
      right: 10px;
      bottom: 8px;
      font-size: 1.1rem;
      opacity: 0.55;
    }
    .ph[data-tone='0'] { background: linear-gradient(135deg, #6b4e3d, #b08968); }
    .ph[data-tone='1'] { background: linear-gradient(135deg, #3f5b4c, #6f9c7f); }
    .ph[data-tone='2'] { background: linear-gradient(135deg, #7a3b3b, #c0402b); }
    .ph[data-tone='3'] { background: linear-gradient(135deg, #454a6b, #7f83a8); }
    .ph[data-tone='4'] { background: linear-gradient(135deg, #6f5f26, #b8992f); }
    .ph[data-tone='5'] { background: linear-gradient(135deg, #5a3b5e, #9a6a9e); }
  `,
})
export class CocktailThumb {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | undefined>(undefined);

  protected readonly failed = signal(false);
  protected readonly showImage = computed(() => !!this.imageUrl() && !this.failed());
  protected readonly initial = computed(() => (this.name()?.[0] ?? '?').toUpperCase());
  protected readonly tone = computed(() => {
    const s = this.name() ?? '';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 6;
  });

  constructor() {
    // Reset the error flag if the image source changes.
    effect(() => {
      this.imageUrl();
      this.failed.set(false);
    });
  }
}
