import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Body, Button, Eyebrow, H1, H2, Muted, Screen } from '../components/ui';
import { hasBackend } from '../lib/config';
import { useTheme } from '../lib/theme';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';
import { syncAfterSignIn, useSync } from '../store/sync';

/**
 * Optional account + local preferences. Signing in enables cross-device sync of cabinet +
 * favorites; the app stays fully usable signed-out. Also hosts the theme toggle, the analytics
 * opt-out, and the GDPR/Play-required account deletion.
 */
export default function AccountScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const error = useAuth((s) => s.error);
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const logout = useAuth((s) => s.logout);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const syncStatus = useSync((s) => s.status);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);

  const themePref = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const analyticsOptOut = useSettings((s) => s.analyticsOptOut);
  const setAnalyticsOptOut = useSettings((s) => s.setAnalyticsOptOut);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'register') await register(email.trim(), password);
      else await login(email.trim(), password);
      await syncAfterSignIn();
      setPassword('');
    } catch {
      /* error is surfaced from the store */
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    const doDelete = async () => {
      setBusy(true);
      try {
        await deleteAccount();
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      // RN Alert has no web implementation; use the browser confirm.
      if (globalThis.confirm?.('Account en alle gegevens definitief verwijderen?')) void doDelete();
      return;
    }
    Alert.alert(
      'Account verwijderen',
      'Dit verwijdert je account en alle gesynchroniseerde gegevens definitief. Je lokale bar op dit apparaat blijft bestaan.',
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Verwijderen', style: 'destructive', onPress: () => void doDelete() },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Account', headerShown: true, headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.ink }} />

      <H1>Account</H1>

      {!hasBackend ? (
        <View style={[styles.note, { backgroundColor: theme.surface2 }]}>
          <Body style={{ fontWeight: '700' }}>Alleen op dit apparaat</Body>
          <Muted>
            Er is geen server ingesteld, dus inloggen en synchroniseren zijn uitgeschakeld. De app
            werkt volledig lokaal — je bar en favorieten blijven op dit apparaat bewaard.
          </Muted>
        </View>
      ) : status === 'authenticated' ? (
        <View style={styles.block}>
          <Eyebrow>Ingelogd</Eyebrow>
          <H2>{user?.email}</H2>
          <Muted>
            {syncStatus === 'offline'
              ? 'Offline — wijzigingen worden gesynchroniseerd zodra er verbinding is.'
              : lastSyncedAt
                ? `Laatst gesynchroniseerd: ${new Date(lastSyncedAt).toLocaleString('nl-NL')}`
                : 'Synchronisatie actief.'}
          </Muted>
          <Muted>Je bar en favorieten worden automatisch bewaard op al je apparaten.</Muted>
          <View style={styles.row}>
            <Button label="Uitloggen" icon="logout" variant="stroked" onPress={() => void logout()} />
          </View>
          <View style={[styles.danger, { borderColor: theme.hairline }]}>
            <Body style={{ fontWeight: '700' }}>Gevarenzone</Body>
            <Muted>Verwijder je account en alle gesynchroniseerde gegevens definitief.</Muted>
            <Button label="Account verwijderen" icon="delete-outline" variant="stroked" danger disabled={busy} onPress={confirmDelete} />
          </View>
        </View>
      ) : (
        <View style={styles.block}>
          <Eyebrow>{mode === 'login' ? 'Inloggen' : 'Account aanmaken'}</Eyebrow>
          <Muted>
            Optioneel — log in om je bar en favorieten te synchroniseren tussen je telefoon en het web.
          </Muted>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-mailadres"
            placeholderTextColor={theme.faint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.ink, borderColor: theme.hairline, backgroundColor: theme.surface }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Wachtwoord (min. 8 tekens)"
            placeholderTextColor={theme.faint}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { color: theme.ink, borderColor: theme.hairline, backgroundColor: theme.surface }]}
          />
          {error ? <Body style={{ color: theme.accent }}>{error}</Body> : null}
          <Button
            label={mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
            icon="login"
            disabled={busy || !email.trim() || password.length < 8}
            onPress={() => void submit()}
          />
          <Button
            label={mode === 'login' ? 'Nog geen account? Aanmaken' : 'Al een account? Inloggen'}
            variant="text"
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          />
        </View>
      )}

      {/* Local preferences (always available) */}
      <View style={[styles.block, { marginTop: 12 }]}>
        <H2>Voorkeuren</H2>
        <View style={styles.settingRow}>
          <Body style={{ flex: 1 }}>Donker thema</Body>
          <Switch
            value={themePref === 'dark'}
            onValueChange={(on) => setTheme(on ? 'dark' : 'light')}
            trackColor={{ true: theme.accent }}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Body>Anonieme statistieken delen</Body>
            <Muted>Alleen geaggregeerd, nooit persoonlijk. Uit = er wordt niets verstuurd.</Muted>
          </View>
          <Switch
            value={!analyticsOptOut}
            onValueChange={(on) => setAnalyticsOptOut(!on)}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, marginTop: 8 },
  note: { padding: 16, borderRadius: 12, gap: 6, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  danger: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8, marginTop: 16 },
  input: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
