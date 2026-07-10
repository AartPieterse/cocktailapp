import { useColorScheme } from 'react-native';
import { useSettings } from '../store/settings';

/**
 * The editorial palette, ported 1:1 from the Angular web app's `styles.scss` (`--bg`, `--surface`,
 * `--accent`, …) so the Expo web build and the retired Angular site look identical, and Android
 * matches the web. Light + dark variants; the active theme follows the user's saved preference,
 * falling back to the OS colour scheme.
 */
export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  faint: string;
  hairline: string;
  accent: string;
  accentStrong: string;
  accentInk: string;
  accentSoft: string;
  ok: string;
  radius: number;
  radiusLg: number;
}

export const lightTheme: Theme = {
  bg: '#fbfaf7',
  surface: '#ffffff',
  surface2: '#f4f1ea',
  ink: '#1a1712',
  muted: '#6e675c',
  faint: '#9a9084',
  hairline: '#e6e1d7',
  accent: '#c0402b',
  accentStrong: '#a4331f',
  accentInk: '#ffffff',
  accentSoft: 'rgba(192, 64, 43, 0.10)',
  ok: '#1f6f3f',
  radius: 6,
  radiusLg: 12,
};

export const darkTheme: Theme = {
  bg: '#16130f',
  surface: '#1e1a15',
  surface2: '#262019',
  ink: '#f4efe6',
  muted: '#a79e90',
  faint: '#7d7466',
  hairline: '#322b22',
  accent: '#e0745a',
  accentStrong: '#eb8168',
  accentInk: '#1a1207',
  accentSoft: 'rgba(224, 116, 90, 0.14)',
  ok: '#4caf7d',
  radius: 6,
  radiusLg: 12,
};

export type ThemePref = 'light' | 'dark' | 'system';

/** Resolve the active theme from the saved preference + the OS colour scheme. */
export function useTheme(): { theme: Theme; scheme: 'light' | 'dark' } {
  const pref = useSettings((s) => s.theme);
  const os = useColorScheme();
  const scheme: 'light' | 'dark' = pref === 'system' ? (os === 'dark' ? 'dark' : 'light') : pref;
  return { theme: scheme === 'dark' ? darkTheme : lightTheme, scheme };
}
