import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

/**
 * "Mijn bar" — the set of ingredient ids the user has on hand. This is the input to the flagship
 * `computeMakeable` search. Local-first: always the on-device working copy (anonymous = local only).
 * When signed in, the sync layer (see store/sync.ts) mirrors it to `PUT /api/me/data`.
 *
 * Ported from the web app's `CabinetService` (localStorage `barkast.cabinet`); ids are stored as a
 * sorted array for stable, predictable equality and requests.
 */
interface CabinetState {
  ids: string[];
  hydrated: boolean;
  has: (id: string) => boolean;
  toggle: (id: string, on?: boolean) => void;
  /** Replace the whole cabinet at once (used when finishing the wizard, and on sync merge). */
  setAll: (ids: Iterable<string>) => void;
  clear: () => void;
}

const sortUnique = (ids: Iterable<string>) => [...new Set(ids)].sort();

export const useCabinet = create<CabinetState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      has: (id) => get().ids.includes(id),
      toggle: (id, on) => {
        const cur = new Set(get().ids);
        const shouldAdd = on ?? !cur.has(id);
        if (shouldAdd) cur.add(id);
        else cur.delete(id);
        set({ ids: sortUnique(cur) });
      },
      setAll: (ids) => set({ ids: sortUnique(ids) }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'barkast.cabinet',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ ids: s.ids }),
      onRehydrateStorage: () => () => useCabinet.setState({ hydrated: true }),
    },
  ),
);
