import { computeMakeable } from '@cocktailapp/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassArt } from '../../components/GlassArt';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';

interface Status {
  color: string;
  label: string;
}

/** The full collection: a searchable list of glass rows, each with an availability status dot. */
export default function CocktailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const catalog = useCatalog((s) => s.catalog);
  const ids = useCabinet((s) => s.ids);
  const [q, setQ] = useState('');

  const missingById = useMemo(() => {
    const map = new Map<string, { count: number; first?: string }>();
    if (!ids.length) return map;
    for (const r of computeMakeable(catalog.cocktails, ids, 99)) {
      map.set(r.cocktail.id, { count: r.missingCount, first: r.missing[0]?.name });
    }
    return map;
  }, [catalog.cocktails, ids]);

  const cocktails = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.cocktails
      .filter((c) => !needle || c.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog.cocktails, q]);

  const statusFor = (id: string, hasIngredients: boolean): Status => {
    const m = missingById.get(id);
    const count = m?.count ?? (hasIngredients ? 99 : 0);
    if (count === 0) return { color: theme.ok, label: 'Nu te maken' };
    if (count === 1) return { color: theme.warn, label: `Mist ${m?.first ?? '1 ingrediënt'}` };
    return { color: theme.dim, label: `${count} ingrediënten nodig` };
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 30 }}>
        <Text style={[styles.title, { color: theme.ink, fontFamily: theme.fontDisplay }]}>Alle cocktails</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Zoek op naam…"
          placeholderTextColor={theme.faint}
          style={[styles.search, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.hairline }]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ marginTop: 14 }}>
          {cocktails.map((c) => {
            const s = statusFor(c.id, c.ingredients.length > 0);
            return (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/cocktails/${c.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: theme.hairline, backgroundColor: pressed ? theme.surface2 : 'transparent' },
                ]}
              >
                <View style={styles.rowGlass}>
                  <GlassArt cocktail={c} width={40} height={50} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowName, { color: theme.ink, fontFamily: theme.fontDisplay }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <View style={styles.rowStatus}>
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text style={{ color: theme.faint, fontSize: 12 }} numberOfLines={1}>
                      {s.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
          {cocktails.length === 0 ? (
            <Text style={{ color: theme.muted, marginTop: 16 }}>Niets gevonden. Pas je zoekopdracht aan.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '600', letterSpacing: -0.6 },
  search: {
    marginTop: 16,
    height: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: 1 },
  rowGlass: { width: 40, height: 50 },
  rowName: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
