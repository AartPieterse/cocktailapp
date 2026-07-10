import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';
import type { ThemePref } from '../lib/theme';

/**
 * On-device app settings: theme preference, whether the first-run wizard is done, and the
 * analytics opt-out. Persisted under `barkast.settings` (mirrors the web app's `barkast.theme` /
 * `barkast.wizardDone` signal services). Anonymous and local — never synced to an account.
 */
interface SettingsState {
  theme: ThemePref;
  wizardDone: boolean;
  /** When true, the app sends NO analytics events (privacy-preserving, opt-out honoured). */
  analyticsOptOut: boolean;
  /** True once the persisted state has been rehydrated — gates first-run onboarding flicker. */
  hydrated: boolean;
  setTheme: (theme: ThemePref) => void;
  toggleTheme: () => void;
  completeWizard: () => void;
  setAnalyticsOptOut: (optOut: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      wizardDone: false,
      analyticsOptOut: false,
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      completeWizard: () => set({ wizardDone: true }),
      setAnalyticsOptOut: (analyticsOptOut) => set({ analyticsOptOut }),
    }),
    {
      name: 'barkast.settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        theme: s.theme,
        wizardDone: s.wizardDone,
        analyticsOptOut: s.analyticsOptOut,
      }),
      // Flip `hydrated` once persisted values are loaded, so screens can wait before deciding
      // whether to show onboarding.
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);
