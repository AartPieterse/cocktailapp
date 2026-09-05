import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import type { Ingredient } from '@cocktailapp/shared';
import { pairwise, startWith } from 'rxjs';
import { CabinetService } from './cabinet.service';
import { LanguageService } from './language.service';
import { ToastService } from './toast.service';
import { IngredientService } from '../services/ingredient.service';

/**
 * Confirms what changed in the cabinet, and nothing more.
 *
 * This replaces the former `UnlockWatcher`, which computed which cocktails an addition had made
 * makeable and raised a celebratory "+N ontgrendeld". That tied a reward to acquiring drink — the
 * product rule is now that the app never celebrates an acquisition and never shows a per-user
 * count that rises as you own more. So the makeable diff is gone: this only names what you ticked.
 *
 * Runs app-wide (instantiated by the Layout) so it fires whichever surface changed the cabinet.
 * Silent on the initial load and on a bulk set such as finishing the wizard.
 */
const BULK_CHANGE_THRESHOLD = 5;

@Injectable({ providedIn: 'root' })
export class CabinetNotice {
  private readonly cabinet = inject(CabinetService);
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly ingredientService = inject(IngredientService);

  private readonly ingredients = signal<Ingredient[]>([]);

  constructor() {
    this.ingredientService.getAll().subscribe((list) => this.ingredients.set(list));

    toObservable(this.cabinet.ids)
      .pipe(startWith(this.cabinet.ids()), pairwise(), takeUntilDestroyed())
      .subscribe(([before, after]) => this.report(new Set(before), new Set(after)));
  }

  private report(before: Set<string>, after: Set<string>): void {
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));
    const t = this.lang.t().toast;

    if (added.length > BULK_CHANGE_THRESHOLD || removed.length > BULK_CHANGE_THRESHOLD) return;

    if (added.length === 1) this.toast.info(t.added(this.ingredientName(added[0])));
    else if (added.length > 1) this.toast.info(t.addedMany(added.length));
    else if (removed.length === 1) this.toast.info(t.removed(this.ingredientName(removed[0])));
  }

  private ingredientName(id: string): string {
    return this.ingredients().find((i) => i.id === id)?.name ?? id;
  }
}
