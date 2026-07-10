import {
  CATEGORY_HINTS,
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';
import { useSettings } from '../../store/settings';

interface WizardStep {
  key: string;
  title: string;
  hint: string;
  items: Ingredient[];
}

/**
 * First-run bar builder. Staples first (pre-checked on the very first run), then one step per
 * category. A progress bar, pill chips and a Terug/Volgende footer; finishing writes the whole
 * cabinet at once and marks the wizard done.
 */
export default function WizardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const catalog = useCatalog((s) => s.catalog);
  const cabinetIds = useCabinet((s) => s.ids);
  const setAll = useCabinet((s) => s.setAll);
  const wizardDone = useSettings((s) => s.wizardDone);
  const completeWizard = useSettings((s) => s.completeWizard);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [seeded, setSeeded] = useState(false);

  const steps = useMemo<WizardStep[]>(() => {
    const list = catalog.ingredients;
    if (!list.length) return [];
    const out: WizardStep[] = [];
    const staples = list.filter((i) => i.isStaple);
    if (staples.length) {
      out.push({
        key: 'staples',
        title: 'Dit heb je vast al in huis',
        hint: 'IJs, suiker, citroensap… vink aan wat klopt. We hebben alvast wat aangevinkt.',
        items: [...staples].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    for (const cat of CATEGORY_ORDER) {
      const items = list
        .filter((i) => (i.category ?? 'other') === cat && !i.isStaple)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (items.length) {
        out.push({
          key: cat,
          title: CATEGORY_LABELS_PLURAL[cat as IngredientCategory],
          hint: CATEGORY_HINTS[cat as IngredientCategory],
          items,
        });
      }
    }
    return out;
  }, [catalog.ingredients]);

  useEffect(() => {
    if (seeded || !catalog.ingredients.length) return;
    const init = new Set(cabinetIds);
    if (!wizardDone) for (const i of catalog.ingredients) if (i.isStaple) init.add(i.id);
    setSelection(init);
    setSeeded(true);
  }, [seeded, catalog.ingredients, cabinetIds, wizardDone]);

  useEffect(() => {
    if (steps.length && current > steps.length - 1) setCurrent(steps.length - 1);
  }, [steps.length, current]);

  const step = steps[current];
  const isLast = current >= steps.length - 1;
  const pct = steps.length ? Math.round(((current + 1) / steps.length) * 100) : 0;

  const toggle = (id: string) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const finish = () => {
    setAll(selection);
    completeWizard();
    track({ type: 'wizard_complete' });
    router.replace('/');
  };
  const next = () => (isLast ? finish() : setCurrent((v) => v + 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 }}>
        <View style={styles.topRow}>
          <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 12 }}>
            Stap {current + 1} van {steps.length}
          </Text>
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <Text style={{ color: theme.dim, fontWeight: '600', fontSize: 12 }}>Overslaan</Text>
          </Pressable>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surface3 }]}>
          <View style={[styles.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
        {step ? (
          <>
            <Text style={[styles.h1, { color: theme.ink, fontFamily: theme.fontDisplay }]}>{step.title}</Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }}>{step.hint}</Text>
            <View style={styles.chips}>
              {step.items.map((ing) => {
                const on = selection.has(ing.id);
                return (
                  <Pressable
                    key={ing.id}
                    onPress={() => toggle(ing.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? theme.accentSoft : theme.surface,
                        borderColor: on ? theme.accent : theme.hairline,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={{ color: on ? theme.accent : theme.muted, fontWeight: '600', fontSize: 13.5 }}>
                      {ing.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Text style={{ color: theme.muted }}>Catalogus laden…</Text>
        )}
      </ScrollView>

      <View style={[styles.foot, { borderTopColor: theme.hairline, backgroundColor: theme.bg }]}>
        {current > 0 ? (
          <Pressable onPress={() => setCurrent((v) => Math.max(0, v - 1))} style={[styles.btnBack, { borderColor: theme.hairline }]}>
            <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 14 }}>Terug</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={next} style={[styles.btnNext, { backgroundColor: theme.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {isLast ? 'Klaar — toon mijn bar' : 'Volgende'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { marginTop: 10, height: 4, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  h1: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5, lineHeight: 30 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 22 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 40, borderWidth: 1.6 },
  foot: { flexDirection: 'row', gap: 12, padding: 16, paddingHorizontal: 24, borderTopWidth: 1 },
  btnBack: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5 },
  btnNext: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
});
