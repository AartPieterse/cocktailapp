import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyStorageKeys } from './storage-migration';

/**
 * The rename from "Barkast" to "Barkaart" moved the whole localStorage namespace. The cabinet is
 * the one thing a user actually invested time in, so a migration that silently drops it is worse
 * than no rename at all — these tests pin the three properties that make it safe to ship: it
 * carries data forward, it never clobbers newer data, and it leaves the old copy alone so a
 * rollback to a pre-rename build still finds a cabinet.
 */
describe('migrateLegacyStorageKeys', () => {
  beforeEach(() => localStorage.clear());

  it('carries a pre-rename cabinet over to the new namespace', () => {
    localStorage.setItem('barkast.cabinet', '["gin","tonic"]');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem('barkaart.cabinet')).toBe('["gin","tonic"]');
  });

  it('leaves the legacy key in place, so a rollback still finds the cabinet', () => {
    localStorage.setItem('barkast.favorites', '["negroni"]');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem('barkast.favorites')).toBe('["negroni"]');
  });

  it('never overwrites a value already written under the new name', () => {
    localStorage.setItem('barkast.cabinet', '["old"]');
    localStorage.setItem('barkaart.cabinet', '["current"]');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem('barkaart.cabinet')).toBe('["current"]');
  });

  it('is idempotent — a second run after a change does not resurrect the old value', () => {
    localStorage.setItem('barkast.cabinet', '["old"]');

    migrateLegacyStorageKeys();
    localStorage.setItem('barkaart.cabinet', '["edited"]');
    migrateLegacyStorageKeys();

    expect(localStorage.getItem('barkaart.cabinet')).toBe('["edited"]');
  });

  it('writes nothing for a fresh install', () => {
    migrateLegacyStorageKeys();

    expect(localStorage.length).toBe(0);
  });

  it('covers every key the app persists, not just the cabinet', () => {
    const keys = [
      'analyticsOptOut', 'auth', 'cabinet', 'favorites', 'install.dismissed', 'locale',
      'staplesApplied', 'substitutes', 'sync', 'theme', 'units', 'wizardDone', 'wizardDraft',
    ];
    for (const key of keys) localStorage.setItem(`barkast.${key}`, `value-${key}`);

    migrateLegacyStorageKeys();

    for (const key of keys) {
      expect(localStorage.getItem(`barkaart.${key}`), `key ${key} was not migrated`).toBe(`value-${key}`);
    }
  });
});
