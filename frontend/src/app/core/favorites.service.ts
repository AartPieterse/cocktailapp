import { Injectable, computed, effect, signal } from '@angular/core';

const KEY = 'barkast.favorites';

/** Favorite cocktail ids, persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _ids = signal<Set<string>>(this.read());

  readonly ids = computed(() => [...this._ids()]);
  readonly count = computed(() => this._ids().size);

  has(id: string): boolean {
    return this._ids().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this._ids());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._ids.set(next);
  }

  /** Replace the whole favorites set at once (used by cloud sync when applying remote state). */
  setAll(ids: Iterable<string>): void {
    this._ids.set(new Set(ids));
  }

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify([...this._ids()]));
      } catch {
        /* ignore */
      }
    });
  }

  private read(): Set<string> {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    return new Set();
  }
}
