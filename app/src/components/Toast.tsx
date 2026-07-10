import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useToast } from '../store/toast';

/** Transient confirmation pill (e.g. "Gin toegevoegd aan je kast"). Mounted once in the root layout. */
export function Toast() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 78 }]}>
      <View style={[styles.pill, { backgroundColor: theme.night }]}>
        <Text style={{ color: '#8FD0A6', fontWeight: '700' }}>✓</Text>
        <Text style={{ color: theme.nightInk, fontWeight: '600', fontSize: 13 }}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 90 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
