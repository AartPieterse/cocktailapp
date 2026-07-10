import {
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Body, H1, H2, Muted, Screen } from '../../components/ui';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';

/**
 * The full ingredient list grouped by category, each row a toggle into "Mijn bar". Ported from the
 * web `ingredient-list.ts`. Toggling here updates the cabinet store, which re-runs `computeMakeable`
 * on the Bar screen and (when signed in) syncs.
 */
export default function IngredientenScreen() {
  const { theme } = useTheme();
  const catalog = useCatalog((s) => s.catalog);
  const ids = useCabinet((s) => s.ids);
  const toggle = useCabinet((s) => s.toggle);
  const inBar = useMemo(() => new Set(ids), [ids]);
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (i: Ingredient) =>
      !needle ||
      i.name.toLowerCase().includes(needle) ||
      (i.aliases ?? []).some((a) => a.toLowerCase().includes(needle));
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: catalog.ingredients
        .filter((i) => (i.category ?? 'other') === cat && match(i))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [catalog.ingredients, q]);

  const onToggle = (i: Ingredient) => {
    const willAdd = !inBar.has(i.id);
    toggle(i.id);
    if (willAdd) track({ type: 'cabinet_add', ingredientId: i.id });
  };

  return (
    <Screen>
      <H1>Ingrediënten</H1>
      <Muted>{inBar.size} in je bar</Muted>
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Zoek een ingrediënt…"
          placeholderTextColor={theme.faint}
          style={[styles.input, { color: theme.ink }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {groups.map((g) => (
        <View key={g.cat} style={styles.group}>
          <H2 style={{ marginBottom: 4 }}>{CATEGORY_LABELS_PLURAL[g.cat as IngredientCategory]}</H2>
          {g.items.map((i) => {
            const on = inBar.has(i.id);
            return (
              <Pressable
                key={i.id}
                onPress={() => onToggle(i)}
                style={[styles.row, { borderBottomColor: theme.hairline }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <MaterialIcons
                  name={on ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={on ? theme.accent : theme.faint}
                />
                <Body style={{ flex: 1, fontWeight: on ? '600' : '400' }}>
                  {i.name}
                  {i.isStaple ? '  ·  basis' : ''}
                </Body>
              </Pressable>
            );
          })}
        </View>
      ))}

      {groups.length === 0 ? <Muted style={{ marginTop: 12 }}>Niets gevonden.</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 4 },
  input: { height: 44, fontSize: 15 },
  group: { marginTop: 16, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
});
