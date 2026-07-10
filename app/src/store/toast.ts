import { create } from 'zustand';

/**
 * A tiny transient toast (e.g. "Gin toegevoegd aan je kast"). Shown by the <Toast> host mounted in
 * the root layout; auto-dismisses. Not persisted — purely in-memory UI feedback.
 */
interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 1900);
  },
  hide: () => set({ message: null }),
}));
