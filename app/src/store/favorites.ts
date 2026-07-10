import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

/**
 * Favorite cocktail ids. Local-first working copy (anonymous = local only); mirrored to
 * `PUT /api/me/data` by the sync layer when signed in. Ported from the web `FavoritesService`
 * (localStorage `barkast.favorites`).
 */
interface FavoritesState {
  ids: string[];
  hydrated: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  setAll: (ids: Iterable<string>) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      has: (id) => get().ids.includes(id),
      toggle: (id) => {
        const cur = new Set(get().ids);
        if (cur.has(id)) cur.delete(id);
        else cur.add(id);
        set({ ids: [...cur] });
      },
      setAll: (ids) => set({ ids: [...new Set(ids)] }),
    }),
    {
      name: 'barkast.favorites',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ ids: s.ids }),
      onRehydrateStorage: () => () => useFavorites.setState({ hydrated: true }),
    },
  ),
);
