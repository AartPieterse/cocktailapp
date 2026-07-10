import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CocktailCard } from '../../components/CocktailCard';
import { Body, H1, Muted, Screen } from '../../components/ui';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';

/**
 * The cocktail collection: free-text search over names + a tag filter. Ported from the web
 * `cocktail-list.ts`. The `tag` query param lets the detail screen deep-link into a filtered list.
 */
export default function CocktailsScreen() {
  const { theme } = useTheme();
  const catalog = useCatalog((s) => s.catalog);
  const params = useLocalSearchParams<{ tag?: string }>();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    if (params.tag) setTag(params.tag);
  }, [params.tag]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const c of catalog.cocktails) for (const t of c.tags ?? []) set.add(t);
    return [...set].sort();
  }, [catalog.cocktails]);

  const cocktails = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.cocktails
      .filter((c) => !needle || c.name.toLowerCase().includes(needle))
      .filter((c) => !tag || (c.tags ?? []).includes(tag))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog.cocktails, q, tag]);

  return (
    <Screen>
      <H1>Cocktails</H1>
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Zoek op naam…"
          placeholderTextColor={theme.faint}
          style={[styles.input, { color: theme.ink }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          <FilterChip label="Alles" active={!tag} onPress={() => setTag(null)} />
          {tags.map((t) => (
            <FilterChip key={t} label={`#${t}`} active={tag === t} onPress={() => setTag(tag === t ? null : t)} />
          ))}
        </View>
      ) : null}

      <Muted>
        {cocktails.length} {cocktails.length === 1 ? 'cocktail' : 'cocktails'}
      </Muted>

      {cocktails.length === 0 ? (
        <Muted style={{ marginTop: 12 }}>Niets gevonden. Pas je zoekopdracht of filter aan.</Muted>
      ) : (
        <View style={styles.grid}>
          {cocktails.map((c) => (
            <CocktailCard key={c.id} cocktail={c} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accentSoft : theme.surface,
          borderColor: active ? theme.accent : theme.hairline,
        },
      ]}
    >
      <Body
        style={{
          color: active ? theme.accentStrong : theme.muted,
          fontWeight: active ? '700' : '500',
          fontSize: 14,
        }}
      >
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 4 },
  input: { height: 44, fontSize: 15 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
});
