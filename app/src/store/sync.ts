import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as api from '../lib/api';
import { zustandStorage } from '../lib/storage';
import { useAuth } from './auth';
import { useCabinet } from './cabinet';
import { useFavorites } from './favorites';

/**
 * Local-first sync of cabinet + favorites (Part D "Local-first sync").
 *
 * - Zustand stores are the on-device working copy, ALWAYS. Anonymous = local only, zero network.
 * - **On sign-in** ({@link syncAfterSignIn}): pull `/api/me/data`, union-merge with local (so
 *   linking a device never loses either side), write back → both ends agree.
 * - **On app open, authed + online** ({@link syncOnOpen}): flush any queued offline edits first,
 *   otherwise adopt the server copy (server-authoritative once linked).
 * - **On every local edit**: a debounced `PUT` mirrors the change up. If it fails (offline), the
 *   `pendingPush` flag is set and persisted, so the edit is flushed on the next open/reconnect.
 *
 * Same code on Android + web ⇒ the same account shows the same cabinet/favorites everywhere.
 */
interface SyncState {
  status: 'idle' | 'syncing' | 'offline';
  lastSyncedAt: string | null;
  /** Unpushed local edits exist (offline queue of size ≤ 1 — we always push the full working copy). */
  pendingPush: boolean;
  setStatus: (status: SyncState['status']) => void;
  setPending: (pendingPush: boolean) => void;
  setSynced: (at: string) => void;
}

export const useSync = create<SyncState>()(
  persist(
    (set) => ({
      status: 'idle',
      lastSyncedAt: null,
      pendingPush: false,
      setStatus: (status) => set({ status }),
      setPending: (pendingPush) => set({ pendingPush }),
      setSynced: (lastSyncedAt) => set({ lastSyncedAt, pendingPush: false }),
    }),
    {
      name: 'barkast.sync',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ pendingPush: s.pendingPush, lastSyncedAt: s.lastSyncedAt }),
    },
  ),
);

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/** Suppresses the change-subscription while we apply a remote copy, so a pull can't trigger a push. */
let applyingRemote = false;

function applyLocal(cabinet: string[], favorites: string[]): void {
  applyingRemote = true;
  useCabinet.getState().setAll(cabinet);
  useFavorites.getState().setAll(favorites);
  applyingRemote = false;
}

async function push(): Promise<boolean> {
  const cabinet = useCabinet.getState().ids;
  const favorites = useFavorites.getState().ids;
  const res = await useAuth.getState().withAuth((token) =>
    api.putMeData(token, { cabinet, favorites }),
  );
  return res !== null;
}

/** First link after sign-in: union-merge local + server, write both ends. */
export async function syncAfterSignIn(): Promise<void> {
  const sync = useSync.getState();
  sync.setStatus('syncing');
  const remote = await useAuth.getState().withAuth((token) => api.getMeData(token));
  if (remote === null) {
    sync.setStatus('offline');
    sync.setPending(true);
    return;
  }
  const cabinet = union(useCabinet.getState().ids, remote.cabinet);
  const favorites = union(useFavorites.getState().ids, remote.favorites);
  applyLocal(cabinet, favorites);
  const ok = await push();
  if (ok) sync.setSynced(new Date().toISOString());
  else {
    sync.setStatus('offline');
    sync.setPending(true);
  }
}

/** On app open (authed): flush queued edits, else adopt the server copy. */
export async function syncOnOpen(): Promise<void> {
  if (useAuth.getState().status !== 'authenticated') return;
  const sync = useSync.getState();
  sync.setStatus('syncing');
  if (sync.pendingPush) {
    const ok = await push();
    if (ok) sync.setSynced(new Date().toISOString());
    else sync.setStatus('offline');
    return;
  }
  const remote = await useAuth.getState().withAuth((token) => api.getMeData(token));
  if (remote === null) {
    sync.setStatus('offline');
    return;
  }
  applyLocal(remote.cabinet, remote.favorites);
  sync.setSynced(new Date().toISOString());
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced mirror of the working copy to the server (1.5s), queued offline on failure. */
function schedulePush(): void {
  if (useAuth.getState().status !== 'authenticated') return;
  const sync = useSync.getState();
  sync.setPending(true);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void (async () => {
      const ok = await push();
      if (ok) useSync.getState().setSynced(new Date().toISOString());
      else useSync.getState().setStatus('offline');
    })();
  }, 1500);
}

/**
 * Wire local edits → debounced push. Call once at app start. Edits made while applying a remote
 * copy are ignored (no echo). Signed-out edits are local only.
 */
export function initSync(): void {
  const onChange = () => {
    if (applyingRemote) return;
    schedulePush();
  };
  useCabinet.subscribe((s, prev) => {
    if (s.ids !== prev.ids) onChange();
  });
  useFavorites.subscribe((s, prev) => {
    if (s.ids !== prev.ids) onChange();
  });
}
