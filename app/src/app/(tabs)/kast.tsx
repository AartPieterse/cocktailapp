import {
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  computeMakeable,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';

/**
 * "Mijn kast" — tick what you have on hand, grouped by category, with a live makeable count. The
 * primary way to build a bar after the first-run wizard; toggling re-runs `computeMakeable` for the
 * Bar screen. Mirrors the web cabinet editor.
 */
export default function KastScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const catalog = useCatalog((s) => s.catalog);
  const ids = useCabinet((s) => s.ids);
  const toggle = useCabinet((s) => s.toggle);
  const inBar = useMemo(() => new Set(ids), [ids]);

  const makeableCount = useMemo(
    () => (ids.length ? computeMakeable(catalog.cocktails, ids, 0).length : 0),
    [catalog.cocktails, ids],
  );

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        label: CATEGORY_LABELS_PLURAL[cat as IngredientCategory],
        items: catalog.ingredients
          .filter((i) => (i.category ?? 'other') === cat)
          .sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((g) => g.items.length > 0),
    [catalog.ingredients],
  );

  const onToggle = (i: Ingredient) => {
    if (!inBar.has(i.id)) track({ type: 'cabinet_add', ingredientId: i.id });
    toggle(i.id);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
        <Text style={[styles.title, { color: theme.ink, fontFamily: theme.fontDisplay }]}>Mijn kast</Text>
        <Text style={[styles.count, { color: theme.ok }]}>
          Je kunt {makeableCount} {makeableCount === 1 ? 'cocktail' : 'cocktails'} maken
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {groups.map((g) => (
          <View key={g.cat} style={{ marginTop: 22 }}>
            <Text style={[styles.groupLabel, { color: theme.dim }]}>{g.label.toUpperCase()}</Text>
            <View style={styles.chips}>
              {g.items.map((i) => {
                const on = inBar.has(i.id);
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => onToggle(i)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? theme.accentSoft : theme.surface,
                        borderColor: on ? theme.accent : theme.hairline,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={{ color: on ? theme.accent : theme.muted, fontWeight: '600', fontSize: 13.5 }}>
                      {i.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => router.push('/bar/wizard')}
          style={[styles.wizardBtn, { borderColor: theme.hairline }]}
        >
          <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 13 }}>Opnieuw met de wizard</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  count: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  groupLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 40, borderWidth: 1.6 },
  wizardBtn: {
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
});
