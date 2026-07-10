import { Injectable, effect, signal } from '@angular/core';

const KEY = 'barkast.substitutes';

/**
 * "Ook vervangers meetellen" — when on, the cabinet is expanded (via the shared `expandCabinet`)
 * before the makeable search, so stocking a specific bottle satisfies a generic recipe call and
 * vice-versa (e.g. Dark Rum stands in for White Rum). Default ON for a generous "wat kan ik maken";
 * persisted to localStorage. See docs/data-model-refinement.md §2.5 / open decision 5.
 */
@Injectable({ providedIn: 'root' })
export class SubstitutesService {
  readonly enabled = signal<boolean>(this.initial());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, this.enabled() ? '1' : '0');
      } catch {
        /* storage unavailable — ignore */
      }
    });
  }

  toggle(on?: boolean): void {
    this.enabled.update((v) => on ?? !v);
  }

  private initial(): boolean {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === '0') return false;
      if (saved === '1') return true;
    } catch {
      /* ignore */
    }
    return true; // generous by default
  }
}
