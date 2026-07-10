import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage helpers used across the app.
 *
 * - {@link zustandStorage}: the persistence backend for the Zustand stores (cabinet, favorites,
 *   settings). AsyncStorage maps to `localStorage`/IndexedDB on web and native key-value storage
 *   on Android — the same `barkast.*` keys everywhere, mirroring the Angular web app's localStorage.
 * - {@link secureStorage}: for the auth refresh token, which must not sit in plain AsyncStorage on
 *   a device. Uses Expo SecureStore (Keychain/Keystore) on native and `localStorage` on web (there
 *   is no OS keychain in a browser; sign-in there is opt-in and low-traffic — see the plan).
 */

// During the static web export the app renders under Node, where there is no `window`/localStorage
// and AsyncStorage's web backend would throw. `window` exists on native (RN global) and in the
// browser, so this guard is true ONLY at export time — where persistence is a no-op and the stores
// simply start from their defaults (they rehydrate on the client after hydration).
const canPersist = typeof window !== 'undefined';

/** Zustand `persist` storage adapter — AsyncStorage works on web and native; no-op during SSR. */
export const zustandStorage = {
  getItem: (name: string) => (canPersist ? AsyncStorage.getItem(name) : Promise.resolve(null)),
  setItem: (name: string, value: string) =>
    canPersist ? AsyncStorage.setItem(name, value) : Promise.resolve(),
  removeItem: (name: string) => (canPersist ? AsyncStorage.removeItem(name) : Promise.resolve()),
};

/** A plain string cache (used for the refreshed catalog snapshot). */
export const kv = {
  get: (key: string) => (canPersist ? AsyncStorage.getItem(key) : Promise.resolve(null)),
  set: (key: string, value: string) =>
    canPersist ? AsyncStorage.setItem(key, value) : Promise.resolve(),
  remove: (key: string) => (canPersist ? AsyncStorage.removeItem(key) : Promise.resolve()),
};

const isWeb = Platform.OS === 'web';

/** Secure, small-value storage for the refresh token. Keys must be alphanumeric for SecureStore. */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* storage unavailable — ignore */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
