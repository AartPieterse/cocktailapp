/**
 * One-time rename of the localStorage namespace from `barkast.*` to `barkaart.*`.
 *
 * The app shipped as "Barkast" and every persisted key carried that prefix: the cabinet,
 * favourites, the signed-in tokens, the wizard's progress and the display preferences. Renaming
 * the product without moving those keys would silently empty every existing install — the cabinet
 * is the one thing a user actually invested time in, so losing it is the worst possible
 * introduction to the new name.
 *
 * Runs before Angular bootstraps (see main.ts), so no service ever observes the old namespace.
 *
 * Copy, not move: the legacy keys are deliberately left in place, so a user served an older build
 * (a cached SPA, a rollback) still finds their cabinet where that build looks for it. The cost is
 * one stale copy per key, which the cleanup below removes once the new name has shipped for good.
 * Idempotent — a key that already exists under the new name is never overwritten, so a user who
 * has since changed their cabinet does not get the old one written back over it.
 */
const LEGACY_PREFIX = 'barkast.';
const PREFIX = 'barkaart.';

/** Every key the app persists. Add new ones here as well, or they will not survive the rename. */
const KEYS = [
  'analyticsOptOut',
  'auth',
  'cabinet',
  'favorites',
  'install.dismissed',
  'locale',
  'staplesApplied',
  'sync',
  'theme',
  'units',
  'wizardDone',
  'wizardDraft',
] as const;

/**
 * Keys the app no longer reads. Removed under both prefixes so they do not linger in every
 * install: `substitutes` held the "Vervangers meetellen" switch, which is gone since substitutes
 * always count (they are shown on the card and the recipe instead).
 */
const RETIRED_KEYS = ['substitutes'] as const;

export function migrateLegacyStorageKeys(): void {
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    // Storage blocked (private mode, blocked site data). Nothing to migrate, and the app is
    // expected to run without it anyway.
    return;
  }

  for (const key of KEYS) {
    try {
      if (storage.getItem(PREFIX + key) !== null) continue;
      const legacy = storage.getItem(LEGACY_PREFIX + key);
      if (legacy !== null) storage.setItem(PREFIX + key, legacy);
    } catch {
      // A quota or serialisation error on one key must not abort the remaining ones.
    }
  }

  for (const key of RETIRED_KEYS) {
    try {
      storage.removeItem(PREFIX + key);
      storage.removeItem(LEGACY_PREFIX + key);
    } catch {
      // Same as above: one failing key must not stop the rest.
    }
  }
}
