import { Injectable, signal } from '@angular/core';

export interface ToastData {
  title: string;
  sub?: string;
}

/**
 * A single, self-dismissing confirmation of something the user just did — currently only a cabinet
 * change ("limoensap staat nu in je bar"). Deliberately toneless: there used to be a celebratory
 * "+N ontgrendeld" variant here, and it was removed because rewarding an acquisition is exactly the
 * mechanic this product does not want. Only one toast is visible at a time.
 * Separate from MatSnackBar, which is reserved for errors and admin CRUD confirmations.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastData | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  info(message: string): void {
    this.show({ title: message }, 2600);
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
