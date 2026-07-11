import { MeasureUnit } from './measure-unit';

/**
 * The volume units the app can convert between for display. A recipe stores its authored unit
 * (usually `ml` or `cl`); the detail screen re-expresses volume amounts in the user's preferred
 * unit. Non-volume units (`part`, `dash`, `piece`, …) are never converted.
 */
export type VolumeUnit = 'ml' | 'cl' | 'oz';

export const VOLUME_UNITS: readonly VolumeUnit[] = ['ml', 'cl', 'oz'];

/**
 * Millilitres per unit. `oz` uses the bartending standard of 30 ml (not the 29.5735 ml US fluid
 * ounce) — recipes are written to the round 30 ml jigger, so this keeps whole-ounce pours clean.
 */
const ML_PER_UNIT: Record<VolumeUnit, number> = { ml: 1, cl: 10, oz: 30 };

export function isVolumeUnit(unit: MeasureUnit): unit is VolumeUnit {
  return unit === 'ml' || unit === 'cl' || unit === 'oz';
}

/** A (possibly converted) amount together with the unit it is now expressed in. */
export interface ConvertedMeasure {
  amount: number;
  unit: MeasureUnit;
}

/**
 * Re-express `amount` (given in `unit`) in the `target` volume unit. Only volume units are
 * converted; a non-volume `unit` is returned untouched so a "2 dash" line never becomes "2 oz".
 */
export function convertMeasure(
  amount: number,
  unit: MeasureUnit,
  target: VolumeUnit,
): ConvertedMeasure {
  if (!isVolumeUnit(unit)) return { amount, unit };
  const ml = amount * ML_PER_UNIT[unit];
  return { amount: ml / ML_PER_UNIT[target], unit: target };
}
