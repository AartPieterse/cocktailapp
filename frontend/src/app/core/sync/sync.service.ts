import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import type { MeData, UpdateMeData } from '@cocktailapp/shared';
import { Subject, debounceTime } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CabinetService } from '../cabinet.service';
import { FavoritesService } from '../favorites.service';
import { AuthService } from '../auth/auth.service';

const SYNC_KEY = 'barkast.sync';

interface SyncState {
  lastServerUpdatedAt?: string;
}

/**
 * Cross-device sync of cabinet + favorites for signed-in users. The ONLY place that knows about
 * both auth and the two data services — dependency direction is strictly Sync → {Auth, Cabinet,
 * Favorites}, so nothing imports back into it and there is no cycle.
 *
 * Reconciliation on "became authenticated":
 *  - fresh sign-in (no prior sync record) → UNION local ∪ server, then push the merged baseline,
 *    so anonymous local work is never discarded and another device's data is never wiped;
 *  - startup with a prior record → if the server moved on since we last synced, adopt server
 *    (device-granularity last-writer-wins); otherwise keep local and push if it differs.
 * While authenticated, any local change is debounced and pushed. Fully inert when logged out or
 * `authEnabled` is false — the localStorage effects in Cabinet/Favorites remain the sole store.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cabinet = inject(CabinetService);
  private readonly favorites = inject(FavoritesService);

  private readonly base = environment.apiBaseUrl;
  private wasAuthenticated = false;
  /** Key of the snapshot we last pushed or pulled — guards against the pull→push echo. */
  private lastSyncedKey: string | null = null;
  private readonly pushTrigger = new Subject<void>();

  constructor() {
    if (!environment.authEnabled) return;

    this.pushTrigger.pipe(debounceTime(800)).subscribe(() => this.push(false));

    // React to login / logout / startup-with-token.
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (authed && !this.wasAuthenticated) this.onBecameAuthenticated();
      else if (!authed && this.wasAuthenticated) this.onLoggedOut();
      this.wasAuthenticated = authed;
    });

    // Push local changes while authenticated.
    effect(() => {
      const key = this.snapshotKey(this.cabinet.ids(), this.favorites.ids());
      if (!this.auth.isAuthenticated()) return;
      if (key === this.lastSyncedKey) return;
      this.pushTrigger.next();
    });
  }

  private onBecameAuthenticated(): void {
    this.http.get<MeData>(`${this.base}me/data`).subscribe({
      next: (server) => this.reconcile(server),
      error: () => undefined,
    });
  }

  private onLoggedOut(): void {
    // Keep local cabinet/favorites; forget the sync baseline so the next sign-in re-adopts (union).
    this.lastSyncedKey = null;
    this.writeState({});
  }

  private reconcile(server: MeData): void {
    const state = this.readState();
    const priorSync = state.lastServerUpdatedAt;

    if (priorSync && server.updatedAt) {
      if (server.updatedAt === priorSync) {
        // We are the baseline — keep local, push only if it drifted while offline.
        this.lastSyncedKey = this.snapshotKey(server.cabinet, server.favorites);
        this.push(false);
        return;
      }
      // Server moved on (another device) → adopt it wholesale.
      this.applyRemote(server);
      return;
    }

    // Fresh adopt: union local with server, then push the merged baseline.
    const cabinet = [...new Set([...this.cabinet.ids(), ...server.cabinet])];
    const favorites = [...new Set([...this.favorites.ids(), ...server.favorites])];
    this.cabinet.setAll(cabinet);
    this.favorites.setAll(favorites);
    this.push(true);
  }

  /** Replace local state with the server's and record it as the synced baseline. */
  private applyRemote(server: MeData): void {
    this.lastSyncedKey = this.snapshotKey(server.cabinet, server.favorites);
    if (server.updatedAt) this.writeState({ lastServerUpdatedAt: server.updatedAt });
    this.cabinet.setAll(server.cabinet);
    this.favorites.setAll(server.favorites);
  }

  private push(force: boolean): void {
    if (!this.auth.isAuthenticated()) return;
    const cabinet = this.cabinet.ids();
    const favorites = this.favorites.ids();
    const key = this.snapshotKey(cabinet, favorites);
    if (!force && key === this.lastSyncedKey) return;

    const body: UpdateMeData = { cabinet, favorites };
    this.http.put<MeData>(`${this.base}me/data`, body).subscribe({
      next: (saved) => {
        this.lastSyncedKey = key;
        if (saved.updatedAt) this.writeState({ lastServerUpdatedAt: saved.updatedAt });
      },
      error: () => undefined, // next local change retries; local state is untouched.
    });
  }

  private snapshotKey(cabinet: string[], favorites: string[]): string {
    return JSON.stringify([[...cabinet].sort(), [...favorites].sort()]);
  }

  private readState(): SyncState {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) return JSON.parse(raw) as SyncState;
    } catch {
      /* ignore */
    }
    return {};
  }

  private writeState(state: SyncState): void {
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
}
