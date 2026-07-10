import {
  DIFFICULTY_LABELS,
  GLASSWARE_LABELS,
  METHOD_LABELS,
  type CocktailIngredient,
} from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Eyebrow, H1, H2, Muted, Screen } from '../../components/ui';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { scaledAmount, unitLabel } from '../../lib/format';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';
import { useFavorites } from '../../store/favorites';

/**
 * Cocktail detail. Ported from the web `cocktail-detail.ts`: hero, method/glass/difficulty meta,
 * ingredient lines with an "in je bar" tick and servings scaling, garnish, numbered steps, tags,
 * and a favorite toggle. Reads from the local catalog so it works fully offline.
 */
export default function CocktailDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog((s) => s.catalog);
  const cabinetIds = useCabinet((s) => s.ids);
  const inBar = useMemo(() => new Set(cabinetIds), [cabinetIds]);
  const isFav = useFavorites((s) => (id ? s.ids.includes(id) : false));
  const toggleFav = useFavorites((s) => s.toggle);
  const [servings, setServings] = useState(1);

  const cocktail = useMemo(
    () => catalog.cocktails.find((c) => c.id === id),
    [catalog.cocktails, id],
  );

  useEffect(() => {
    if (cocktail) track({ type: 'cocktail_view', cocktailId: cocktail.id });
  }, [cocktail?.id]);

  const lineInBar = (line: CocktailIngredient) =>
    inBar.has(line.ingredientId) || (line.alternativeIds ?? []).some((a) => inBar.has(a));

  if (!cocktail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Niet gevonden' }} />
        <Eyebrow>404</Eyebrow>
        <H1>Deze cocktail bestaat niet (meer)</H1>
        <Button label="Terug naar de collectie" onPress={() => router.replace('/cocktails')} />
      </Screen>
    );
  }

  const tags = cocktail.tags ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: cocktail.name, headerBackTitle: 'Cocktails' }} />

      <View style={[styles.media, { backgroundColor: theme.surface2, borderColor: theme.hairline }]}>
        {cocktail.imageUrl ? (
          <Image source={{ uri: cocktail.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Body style={{ fontSize: 64, fontWeight: '800', color: theme.faint }}>
            {cocktail.name.charAt(0).toUpperCase()}
          </Body>
        )}
      </View>

      <Eyebrow>{tags[0] ?? 'Cocktail'}</Eyebrow>
      <H1>{cocktail.name}</H1>
      {cocktail.description ? <Body style={{ color: theme.muted }}>{cocktail.description}</Body> : null}

      <View style={[styles.meta, { borderColor: theme.hairline }]}>
        {cocktail.method ? <MetaItem k="Methode" v={METHOD_LABELS[cocktail.method]} /> : null}
        {cocktail.glass ? <MetaItem k="Glas" v={GLASSWARE_LABELS[cocktail.glass]} /> : null}
        {cocktail.difficulty ? <MetaItem k="Niveau" v={DIFFICULTY_LABELS[cocktail.difficulty]} /> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={isFav ? 'Favoriet' : 'Bewaar'}
          icon={isFav ? 'favorite' : 'favorite-border'}
          onPress={() => toggleFav(cocktail.id)}
        />
      </View>

      {/* Ingredients */}
      <View style={styles.colHead}>
        <H2>Ingrediënten</H2>
        <View style={[styles.servings, { borderColor: theme.hairline }]}>
          <Pressable onPress={() => setServings((s) => Math.max(1, s - 1))} hitSlop={8} disabled={servings <= 1}>
            <MaterialIcons name="remove" size={20} color={servings <= 1 ? theme.faint : theme.ink} />
          </Pressable>
          <Body style={{ minWidth: 64, textAlign: 'center' }}>
            {servings} {servings === 1 ? 'glas' : 'glazen'}
          </Body>
          <Pressable onPress={() => setServings((s) => s + 1)} hitSlop={8}>
            <MaterialIcons name="add" size={20} color={theme.ink} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        {cocktail.ingredients.length ? (
          cocktail.ingredients.map((line, idx) => {
            const have = lineInBar(line);
            const amount = scaledAmount(line, servings);
            return (
              <View key={`${line.ingredientId}-${idx}`} style={[styles.line, { borderBottomColor: theme.hairline }]}>
                <MaterialIcons
                  name={have ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={have ? theme.accent : theme.faint}
                />
                {amount ? (
                  <Body style={{ width: 78, color: theme.muted }}>
                    {amount} {unitLabel(line)}
                  </Body>
                ) : (
                  <Body style={{ width: 78, color: theme.muted }}>{unitLabel(line)}</Body>
                )}
                <Body style={{ flex: 1 }}>
                  {line.call ?? line.name}
                  {line.optional ? '  · optioneel' : ''}
                  {line.note ? `  — ${line.note}` : ''}
                </Body>
              </View>
            );
          })
        ) : (
          <Muted>Geen ingrediënten opgegeven.</Muted>
        )}
      </View>

      {cocktail.garnish ? (
        <View style={styles.garnish}>
          <MaterialIcons name="eco" size={18} color={theme.accent} />
          <Body style={{ flex: 1 }}>Garnering: {cocktail.garnish}</Body>
        </View>
      ) : null}

      {/* Method */}
      <H2 style={{ marginTop: 20 }}>Bereiding</H2>
      {cocktail.instructions.length ? (
        cocktail.instructions.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.accentSoft }]}>
              <Body style={{ color: theme.accent, fontWeight: '800' }}>{i + 1}</Body>
            </View>
            <Body style={{ flex: 1 }}>{s}</Body>
          </View>
        ))
      ) : (
        <Muted>Geen instructies opgegeven.</Muted>
      )}

      {cocktail.notes ? <Muted style={{ marginTop: 12 }}>{cocktail.notes}</Muted> : null}

      {tags.length ? (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <Pressable
              key={t}
              onPress={() => router.push({ pathname: '/cocktails', params: { tag: t } })}
              style={[styles.tag, { borderColor: theme.hairline, backgroundColor: theme.surface }]}
            >
              <Muted style={{ color: theme.accent }}>#{t}</Muted>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function MetaItem({ k, v }: { k: string; v: string }) {
  const { theme } = useTheme();
  return (
    <View>
      <Body style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: theme.faint }}>{k}</Body>
      <Body style={{ fontWeight: '700' }}>{v}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    aspectRatio: 16 / 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  garnish: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  stepRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
});
