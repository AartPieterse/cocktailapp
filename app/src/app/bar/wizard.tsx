import {
  CATEGORY_HINTS,
  CATEGORY_LABELS_PLURAL,
  CATEGORY_ORDER,
  type Ingredient,
  type IngredientCategory,
} from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Eyebrow, H1, Muted } from '../../components/ui';
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
 * category in CATEGORY_ORDER. Ported from the web `wizard.ts`: chips, Alles/Niets, a progress row,
 * and a running tally. Finishing writes the whole cabinet at once and marks the wizard done.
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

  // Seed the selection once: existing cabinet + (first run only) pre-checked staples.
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

  const toggle = (id: string) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setStepAll = (items: Ingredient[], on: boolean) =>
    setSelection((prev) => {
      const next = new Set(prev);
      for (const i of items) {
        if (on) next.add(i.id);
        else next.delete(i.id);
      }
      return next;
    });

  const finish = () => {
    setAll(selection);
    completeWizard();
    track({ type: 'wizard_complete' });
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.top, { borderBottomColor: theme.hairline }]}>
        <Pressable onPress={() => router.back()} style={styles.quit} hitSlop={8}>
          <MaterialIcons name="close" size={20} color={theme.muted} />
          <Muted>Sluiten</Muted>
        </Pressable>
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <Pressable
              key={s.key}
              onPress={() => setCurrent(i)}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === current ? theme.accent : i < current ? theme.accentSoft : theme.hairline,
                },
              ]}
              accessibilityLabel={s.title}
            />
          ))}
        </View>
        <Muted>
          <Body style={{ color: theme.accent, fontWeight: '700' }}>{selection.size}</Body> gekozen
        </Muted>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        {step ? (
          <>
            <Eyebrow>
              Stap {current + 1} van {steps.length}
            </Eyebrow>
            <H1 style={{ marginTop: 6 }}>{step.title}</H1>
            <Muted style={{ marginTop: 6 }}>{step.hint}</Muted>

            <View style={styles.quick}>
              <Button label="Alles" icon="done-all" variant="text" onPress={() => setStepAll(step.items, true)} />
              <Button label="Niets" icon="remove-done" variant="text" onPress={() => setStepAll(step.items, false)} />
            </View>

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
                    <MaterialIcons
                      name={on ? 'check-circle' : 'add-circle-outline'}
                      size={18}
                      color={on ? theme.accent : theme.faint}
                    />
                    <Body style={{ color: on ? theme.accentStrong : theme.ink, fontWeight: on ? '600' : '400' }}>
                      {ing.name}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Muted>Catalogus laden…</Muted>
        )}
      </ScrollView>

      <View style={[styles.nav, { borderTopColor: theme.hairline, backgroundColor: theme.bg }]}>
        <Button
          label="Vorige"
          icon="arrow-back"
          variant="stroked"
          disabled={current === 0}
          onPress={() => setCurrent((v) => Math.max(0, v - 1))}
        />
        {isLast ? (
          <Button label="Klaar — bekijk cocktails" icon="check" onPress={finish} />
        ) : (
          <Button label="Volgende" icon="arrow-forward" onPress={() => setCurrent((v) => v + 1)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  dot: { width: 26, height: 5, borderRadius: 999 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16, borderTopWidth: 1 },
});
