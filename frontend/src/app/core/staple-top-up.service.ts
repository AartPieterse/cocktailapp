import { Injectable, inject } from '@angular/core';
import type { Ingredient } from '@cocktailapp/shared';
import { CabinetService } from './cabinet.service';
import { IngredientService } from '../services/ingredient.service';

const APPLIED_KEY = 'barkast.staplesApplied';

/**
 * Carries newly promoted pantry staples into cabinets that already exist.
 *
 * The wizard pre-ticks staples on the first run only (`wizardDone`), so every staple added to the
 * catalog afterwards was invisible to anyone who had already built a bar: their drinks silently
 * *dropped off* the makeable list instead of appearing, because a recipe now called for a "basic"
 * their cabinet did not contain. That is the bug `docs/plans/next-phase.md` records against
 * `wizard.ts` — the seven spices promoted on 5 Sep 2026 reached nobody.
 *
 * The rule: remember which staple set was last applied, and top a *non-empty* cabinet up with the
 * ones added since. A cabinet with nothing in it is left alone — the wizard pre-checks those.
 * The accepted cost is that this silently re-adds a staple a user deliberately unticked, but only
 * on the one run after that staple joins the catalog; it never comes back after that.
 *
 * Runs app-wide (instantiated by the Layout) and writes through `setAll`, which is deliberately
 * silent: these are catalog changes, not choices the user made, and they must not land in the
 * anonymous "most-added ingredient" tally.
 */
@Injectable({ providedIn: 'root' })
export class StapleTopUp {
  private readonly cabinet = inject(CabinetService);
  private readonly ingredientService = inject(IngredientService);

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.apply(list));
  }

  private apply(list: Ingredient[]): void {
    const staples = list
      .filter((i) => i.isStaple)
      .map((i) => i.id)
      .sort();
    if (!staples.length) return;

    const applied = this.read();
    this.write(staples);

    // No bar yet: the wizard pre-checks the staples, so there is nothing to carry over.
    if (this.cabinet.isEmpty()) return;

    // No marker means a cabinet built before this existed — back-fill every staple it lacks, once.
    const known = new Set(applied ?? []);
    const fresh = staples.filter((id) => !known.has(id) && !this.cabinet.has(id));
    if (!fresh.length) return;

    this.cabinet.setAll([...this.cabinet.ids(), ...fresh]);
  }

  private read(): string[] | null {
    try {
      const raw = localStorage.getItem(APPLIED_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : null;
    } catch {
      return null;
    }
  }

  private write(ids: string[]): void {
    try {
      localStorage.setItem(APPLIED_KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable — the top-up simply retries next time */
    }
  }
}
