import { Injectable, signal } from '@angular/core';

export type ToastTone = 'unlock' | 'info';

export interface ToastData {
  tone: ToastTone;
  title: string;
  sub?: string;
}

/**
 * A single, self-dismissing toast used for the "reward" moments in the cabinet → cocktails
 * loop: a celebratory "+N ontgrendeld" when adding an ingredient unlocks new drinks, and a
 * lighter "X toegevoegd" confirmation otherwise. Only one toast is visible at a time — a new
 * one replaces the current. This is intentionally separate from MatSnackBar, which is reserved
 * for errors and admin CRUD confirmations.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastData | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  unlock(names: string[]): void {
    this.show({ tone: 'unlock', title: `+${names.length} ontgrendeld`, sub: names.join(' · ') }, 3800);
  }

  info(message: string): void {
    this.show({ tone: 'info', title: message }, 2200);
  }

  show(data: ToastData, ms: number): void {
    this.current.set(data);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(null), ms);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
