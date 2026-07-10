import {
  DIFFICULTY_LABELS,
  GLASSWARE_LABELS,
  METHOD_LABELS,
  type CocktailIngredient,
} from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassArt } from '../../components/GlassArt';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { washFor } from '../../lib/cocktail-visual';
import { scaledAmount, unitLabel } from '../../lib/format';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';
import { useFavorites } from '../../store/favorites';
import { useToast } from '../../store/toast';

/** Cocktail detail: tinted glass panel, availability banner, meta pills, ingredient lines, steps. */
export default function CocktailDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog((s) => s.catalog);
  const cabinetIds = useCabinet((s) => s.ids);
  const addToCabinet = useCabinet((s) => s.toggle);
  const inBar = useMemo(() => new Set(cabinetIds), [cabinetIds]);
  const isFav = useFavorites((s) => (id ? s.ids.includes(id) : false));
  const toggleFav = useFavorites((s) => s.toggle);
  const toast = useToast((s) => s.show);
  const [servings, setServings] = useState(1);

  const cocktail = useMemo(() => catalog.cocktails.find((c) => c.id === id), [catalog.cocktails, id]);

  useEffect(() => {
    if (cocktail) track({ type: 'cocktail_view', cocktailId: cocktail.id });
  }, [cocktail?.id]);

  const lineInBar = (line: CocktailIngredient) =>
    inBar.has(line.ingredientId) || (line.alternativeIds ?? []).some((a) => inBar.has(a));

  const missingLines = useMemo(
    () =>
      (cocktail?.ingredients ?? []).filter(
        (l) => !l.optional && l.role !== 'garnish' && l.role !== 'seasoning' && !lineInBar(l),
      ),
    [cocktail, inBar],
  );

  const add = (line: CocktailIngredient) => {
    addToCabinet(line.ingredientId, true);
    track({ type: 'cabinet_add', ingredientId: line.ingredientId });
    toast(`${line.call ?? line.name} toegevoegd aan je kast`);
  };
  const addAll = () => {
    for (const l of missingLines) addToCabinet(l.ingredientId, true);
    toast(missingLines.length === 1 ? `${missingLines[0].call ?? missingLines[0].name} toegevoegd` : `${missingLines.length} ingrediënten toegevoegd`);
  };

  if (!cocktail) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: 'Niet gevonden' }} />
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={[styles.title, { color: theme.ink, fontFamily: theme.fontDisplay }]}>
            Deze cocktail bestaat niet (meer)
          </Text>
          <Pressable onPress={() => router.replace('/cocktails')} style={[styles.addAll, { backgroundColor: theme.accent }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Terug naar de collectie</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* header */}
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 14 }}>‹ Terug</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleFav(cocktail.id)}
            style={[styles.fav, { backgroundColor: isFav ? theme.accentSoft : theme.surface2 }]}
            accessibilityLabel={isFav ? 'Verwijder favoriet' : 'Bewaar favoriet'}
          >
            <MaterialIcons name={isFav ? 'favorite' : 'favorite-border'} size={18} color={isFav ? theme.accent : theme.dim} />
          </Pressable>
        </View>

        {/* glass panel */}
        <View style={[styles.panel, { backgroundColor: washFor(cocktail, 0.62) }]}>
          <GlassArt cocktail={cocktail} height={190} />
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={[styles.title, { color: theme.ink, fontFamily: theme.fontDisplay }]}>{cocktail.name}</Text>
          {cocktail.description ? (
            <Text style={[styles.desc, { color: theme.faint }]}>{cocktail.description}</Text>
          ) : null}

          {missingLines.length === 0 ? (
            <View style={[styles.banner, { backgroundColor: theme.okSoft }]}>
              <Text style={{ color: theme.okInk, fontWeight: '600', fontSize: 13.5 }}>
                ✓ Je hebt alles in huis — shaken maar!
              </Text>
            </View>
          ) : (
            <View style={[styles.bannerMiss, { backgroundColor: theme.warnSoft }]}>
              <Text style={{ color: theme.warn, fontWeight: '600', fontSize: 13, flex: 1 }} numberOfLines={2}>
                Je mist nog {missingLines.map((l) => l.call ?? l.name).join(', ')}
              </Text>
              <Pressable onPress={addAll} style={[styles.addAll, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12.5 }}>+ Toevoegen</Text>
              </Pressable>
            </View>
          )}

          {/* meta pills */}
          <View style={styles.pills}>
            {cocktail.glass ? <MetaPill label={GLASSWARE_LABELS[cocktail.glass]} /> : null}
            {cocktail.method ? <MetaPill label={METHOD_LABELS[cocktail.method]} /> : null}
            {cocktail.difficulty ? <MetaPill label={DIFFICULTY_LABELS[cocktail.difficulty]} /> : null}
          </View>

          {/* ingredients */}
          <View style={styles.secHead}>
            <Text style={[styles.secLabel, { color: theme.dim }]}>INGREDIËNTEN</Text>
            <View style={[styles.servings, { borderColor: theme.hairline }]}>
              <Pressable onPress={() => setServings((s) => Math.max(1, s - 1))} hitSlop={8} disabled={servings <= 1}>
                <MaterialIcons name="remove" size={18} color={servings <= 1 ? theme.faint : theme.accent} />
              </Pressable>
              <Text style={{ color: theme.ink, fontWeight: '600', fontSize: 13 }}>
                {servings} {servings === 1 ? 'glas' : 'glazen'}
              </Text>
              <Pressable onPress={() => setServings((s) => s + 1)} hitSlop={8}>
                <MaterialIcons name="add" size={18} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            {cocktail.ingredients.map((line, idx) => {
              const have = lineInBar(line);
              const amount = scaledAmount(line, servings);
              const meas = amount ? `${amount} ${unitLabel(line)}` : unitLabel(line);
              return (
                <View key={`${line.ingredientId}-${idx}`} style={[styles.line, { borderBottomColor: theme.hairline }]}>
                  <Text style={{ width: 74, color: theme.faint, fontWeight: '600', fontSize: 13 }}>{meas}</Text>
                  <Text style={{ flex: 1, color: theme.ink, fontSize: 15 }}>
                    {line.call ?? line.name}
                    {line.optional ? '  (optioneel)' : ''}
                    {line.note ? `  · ${line.note}` : ''}
                  </Text>
                  {have ? (
                    <Text style={{ color: theme.ok, fontWeight: '700', fontSize: 13 }}>✓</Text>
                  ) : !line.optional ? (
                    <Pressable onPress={() => add(line)} style={[styles.plus, { backgroundColor: theme.warnSoft }]}>
                      <Text style={{ color: theme.warn, fontWeight: '700', fontSize: 16 }}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* steps */}
          <Text style={[styles.secLabel, { color: theme.dim, marginTop: 28 }]}>BEREIDING</Text>
          <View style={{ marginTop: 14, gap: 16 }}>
            {cocktail.instructions.map((s, i) => (
              <View key={i} style={styles.step}>
                <Text style={[styles.stepNum, { color: theme.accent, fontFamily: theme.fontDisplay }]}>{i + 1}</Text>
                <Text style={{ flex: 1, color: theme.ink, fontSize: 14.5, lineHeight: 21 }}>{s}</Text>
              </View>
            ))}
          </View>

          {cocktail.garnish ? (
            <View style={[styles.garnish, { backgroundColor: theme.surface2 }]}>
              <Text style={{ color: theme.muted, fontSize: 13 }}>Garnering · {cocktail.garnish}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaPill({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.surface2 }]}>
      <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  back: { paddingVertical: 4 },
  fav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  panel: { marginHorizontal: 20, borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.8, lineHeight: 34 },
  desc: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  banner: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignSelf: 'flex-start' },
  bannerMiss: { marginTop: 18, borderRadius: 14, padding: 12, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addAll: { borderRadius: 11, paddingVertical: 10, paddingHorizontal: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  pill: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
  secLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 40, paddingHorizontal: 10, paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  plus: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: { fontSize: 20, fontWeight: '600', width: 24, lineHeight: 24 },
  garnish: { marginTop: 24, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
});
