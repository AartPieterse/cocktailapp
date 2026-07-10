import { DarkTheme as NavDark, DefaultTheme as NavLight, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { loadCachedCatalog, refreshCatalog } from '../lib/catalog';
import { useTheme } from '../lib/theme';
import { initAuth } from '../store/auth';
import { initSync, syncOnOpen } from '../store/sync';

/**
 * App shell. Wires the one-time startup sequence and applies the editorial theme to the navigator.
 * Everything here degrades gracefully offline — the catalog refresh, auth restore and sync are all
 * best-effort on top of the local-first stores.
 */
export default function RootLayout() {
  const { theme, scheme } = useTheme();

  useEffect(() => {
    // 1) Local-first data: show the cached/bundled catalog instantly, then refresh in the background.
    void loadCachedCatalog();
    void refreshCatalog();
    // 2) Sync wiring: mirror local edits up (debounced) once authenticated.
    initSync();
    // 3) Restore any session, then pull/flush the user's synced data.
    void initAuth().then(() => syncOnOpen());
  }, []);

  const navTheme = scheme === 'dark' ? NavDark : NavLight;
  const themed = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: theme.accent,
      background: theme.bg,
      card: theme.surface,
      text: theme.ink,
      border: theme.hairline,
    },
  };

  return (
    <ThemeProvider value={themed}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bar/wizard" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cocktails/[id]" />
        <Stack.Screen name="account" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
