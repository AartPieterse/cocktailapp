import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '../store/settings';

/**
 * The Barkast editorial palette, kept in step with the web app: warm cream surfaces, a terracotta
 * accent and a green "makeable" signal. Light + dark variants; the active theme follows the user's
 * saved preference, falling back to the OS colour scheme.
 */
export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  muted: string;
  faint: string;
  dim: string;
  hairline: string;
  accent: string;
  accentStrong: string;
  accentInk: string;
  accentSoft: string;
  ok: string;
  okInk: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  /** Inverted "night" surface used for toasts (dark in both themes). */
  night: string;
  nightInk: string;
  navActive: string;
  navInactive: string;
  radius: number;
  radiusLg: number;
  radiusPill: number;
  fontDisplay: string;
}

/** Serif display face for headings (Fraunces on the web); a system serif keeps it font-file-free. */
const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string;

export const lightTheme: Theme = {
  bg: '#fbf6ec',
  surface: '#ffffff',
  surface2: '#efe6d5',
  surface3: '#eae0ce',
  ink: '#241e17',
  muted: '#6b6152',
  faint: '#9a8e7c',
  dim: '#b0a390',
  hairline: 'rgba(36, 30, 23, 0.10)',
  accent: '#c24218',
  accentStrong: '#9c3311',
  accentInk: '#ffffff',
  accentSoft: 'rgba(194, 66, 24, 0.10)',
  ok: '#3b6b4e',
  okInk: '#2f6d4e',
  okSoft: '#e4efe4',
  warn: '#96601a',
  warnSoft: '#f6e9d6',
  night: '#241e17',
  nightInk: '#f7f1e6',
  navActive: '#3b6b4e',
  navInactive: '#a99c88',
  radius: 14,
  radiusLg: 20,
  radiusPill: 40,
  fontDisplay: DISPLAY,
};

export const darkTheme: Theme = {
  bg: '#17120c',
  surface: '#221b13',
  surface2: '#2b2318',
  surface3: '#332a1d',
  ink: '#f4ecda',
  muted: '#b3a892',
  faint: '#9a8e79',
  dim: '#8a7f6c',
  hairline: 'rgba(244, 236, 218, 0.14)',
  accent: '#e8763f',
  accentStrong: '#f2895a',
  accentInk: '#1c1206',
  accentSoft: 'rgba(232, 118, 63, 0.16)',
  ok: '#7cbd94',
  okInk: '#8ec9a6',
  okSoft: 'rgba(124, 189, 148, 0.16)',
  warn: '#d8a44e',
  warnSoft: 'rgba(216, 164, 78, 0.16)',
  night: '#100b06',
  nightInk: '#f4ecda',
  navActive: '#7cbd94',
  navInactive: '#8a7f6c',
  radius: 14,
  radiusLg: 20,
  radiusPill: 40,
  fontDisplay: DISPLAY,
};

export type ThemePref = 'light' | 'dark' | 'system';

/** Resolve the active theme from the saved preference + the OS colour scheme. */
export function useTheme(): { theme: Theme; scheme: 'light' | 'dark' } {
  const pref = useSettings((s) => s.theme);
  const os = useColorScheme();
  const scheme: 'light' | 'dark' = pref === 'system' ? (os === 'dark' ? 'dark' : 'light') : pref;
  return { theme: scheme === 'dark' ? darkTheme : lightTheme, scheme };
}
