import { describe, expect, it } from 'vitest';
import { convertMeasure, isVolumeUnit } from './measure-convert';

describe('convertMeasure', () => {
  it('converts between volume units using the 30 ml ounce', () => {
    expect(convertMeasure(60, 'ml', 'cl')).toEqual({ amount: 6, unit: 'cl' });
    expect(convertMeasure(6, 'cl', 'ml')).toEqual({ amount: 60, unit: 'ml' });
    expect(convertMeasure(30, 'ml', 'oz')).toEqual({ amount: 1, unit: 'oz' });
    expect(convertMeasure(2, 'oz', 'ml')).toEqual({ amount: 60, unit: 'ml' });
    expect(convertMeasure(3, 'cl', 'oz')).toEqual({ amount: 1, unit: 'oz' });
  });

  it('is a no-op when the source equals the target', () => {
    expect(convertMeasure(4.5, 'cl', 'cl')).toEqual({ amount: 4.5, unit: 'cl' });
  });

  it('leaves non-volume units untouched', () => {
    expect(convertMeasure(2, 'dash', 'oz')).toEqual({ amount: 2, unit: 'dash' });
    expect(convertMeasure(1, 'part', 'ml')).toEqual({ amount: 1, unit: 'part' });
    expect(convertMeasure(3, 'piece', 'cl')).toEqual({ amount: 3, unit: 'piece' });
  });
});

describe('isVolumeUnit', () => {
  it('recognises only ml/cl/oz', () => {
    expect(isVolumeUnit('ml')).toBe(true);
    expect(isVolumeUnit('cl')).toBe(true);
    expect(isVolumeUnit('oz')).toBe(true);
    expect(isVolumeUnit('part')).toBe(false);
    expect(isVolumeUnit('dash')).toBe(false);
  });
});
