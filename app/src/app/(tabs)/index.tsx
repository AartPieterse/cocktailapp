import { computeMakeable, type MakeableResult } from '@cocktailapp/shared';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalog } from '../../lib/catalog';

// Scaffold demo only: a fixed sample "cabinet" (first 20 catalog ingredients).
// The real cabinet comes from the persisted Zustand store in a later step; this
// exists purely to prove the shared computeMakeable engine + the bundled catalog
// work end-to-end inside the Expo web/native bundle.
const demoCabinet = catalog.ingredients.slice(0, 20).map((i) => i.id);

export default function BarScreen() {
  const { now, almost, two } = useMemo(() => {
    const results = computeMakeable(catalog.cocktails, demoCabinet, 2);
    return {
      now: results.filter((r) => r.missingCount === 0),
      almost: results.filter((r) => r.missingCount === 1),
      two: results.filter((r) => r.missingCount === 2),
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Barkast</Text>
      <Text style={styles.muted}>
        Catalogus {catalog.version} · {catalog.counts.ingredients} ingrediënten ·{' '}
        {catalog.counts.cocktails} cocktails
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Scaffold OK — computeMakeable draait op {demoCabinet.length} demo-ingrediënten
        </Text>
      </View>

      <Section title="Nu te maken" items={now} />
      <Section title="Bijna — je mist er één" items={almost} />
      <Section title="Twee stapjes weg" items={two} />
    </ScrollView>
  );
}

function Section({ title, items }: { title: string; items: MakeableResult[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>
        {title} ({items.length})
      </Text>
      {items.slice(0, 8).map((r) => (
        <Text key={r.cocktail.id} style={styles.item}>
          • {r.cocktail.name}
          {r.missing.length > 0 ? `  — mist: ${r.missing.map((m) => m.name).join(', ')}` : ''}
        </Text>
      ))}
      {items.length === 0 ? <Text style={styles.item}>—</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  h1: { fontSize: 32, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  muted: { opacity: 0.6 },
  badge: {
    marginTop: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#1f6f3f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: 'white', fontWeight: '600' },
  section: { marginTop: 16 },
  item: { fontSize: 15, lineHeight: 22 },
});
