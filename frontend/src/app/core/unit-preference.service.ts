import { Injectable, effect, signal } from '@angular/core';
import type { VolumeUnit } from '@cocktailapp/shared';
import { VOLUME_UNITS } from '@cocktailapp/shared';

const KEY = 'barkast.units';

/**
 * The user's preferred volume unit (ml / cl / oz) for displaying recipe amounts. Recipes are
 * authored in ml or cl; the detail screen re-expresses volume lines in this unit via the shared
 * `convertMeasure`. Persisted to localStorage; default `ml`. Mirrors the SubstitutesService pattern.
 */
@Injectable({ providedIn: 'root' })
export class UnitPreferenceService {
  readonly unit = signal<VolumeUnit>(this.initial());

  readonly options = VOLUME_UNITS;

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, this.unit());
      } catch {
        /* storage unavailable — ignore */
      }
    });
  }

  set(unit: VolumeUnit): void {
    this.unit.set(unit);
  }

  private initial(): VolumeUnit {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && (VOLUME_UNITS as readonly string[]).includes(saved)) {
        return saved as VolumeUnit;
      }
    } catch {
      /* ignore */
    }
    return 'ml';
  }
}
