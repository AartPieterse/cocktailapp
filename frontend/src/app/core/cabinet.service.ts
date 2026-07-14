import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AnalyticsService } from './analytics.service';

const IDS_KEY = 'barkast.cabinet';
const DONE_KEY = 'barkast.wizardDone';

/**
 * "Mijn bar" — the set of ingredient ids the user has on hand, persisted to
 * localStorage. This is the input to the flagship "wat kan ik maken" search.
 */
@Injectable({ providedIn: 'root' })
export class CabinetService {
  private readonly analytics = inject(AnalyticsService);
  private readonly _ids = signal<Set<string>>(this.readIds());
  private readonly _wizardDone = signal<boolean>(this.readDone());

  /** Selected ingredient ids as a stable array (sorted for predictable requests). */
  readonly ids = computed(() => [...this._ids()].sort());
  readonly count = computed(() => this._ids().size);
  readonly isEmpty = computed(() => this._ids().size === 0);
  readonly wizardDone = this._wizardDone.asReadonly();

  constructor() {
    effect(() => this.write(IDS_KEY, JSON.stringify([...this._ids()])));
    effect(() => this.write(DONE_KEY, this._wizardDone() ? '1' : ''));
  }

  has(id: string): boolean {
    return this._ids().has(id);
  }

  toggle(id: string, on?: boolean): void {
    const current = this._ids();
    const shouldAdd = on ?? !current.has(id);
    const next = new Set(current);
    if (shouldAdd) next.add(id);
    else next.delete(id);
    this._ids.set(next);
    // Anonymous "most-added ingredient" signal — only on a genuine add, never a re-add or removal.
    if (shouldAdd && !current.has(id)) this.analytics.track('cabinet_add', { ingredientId: id });
  }

  /** Replace the whole cabinet at once (used when finishing the wizard). */
  setAll(ids: Iterable<string>): void {
    this._ids.set(new Set(ids));
  }

  clear(): void {
    this._ids.set(new Set());
  }

  completeWizard(): void {
    this._wizardDone.set(true);
  }

  private readIds(): Set<string> {
    try {
      const raw = localStorage.getItem(IDS_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    return new Set();
  }

  private readDone(): boolean {
    try {
      return localStorage.getItem(DONE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — ignore */
    }
  }
}
