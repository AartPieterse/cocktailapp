import { computeMakeable, type Ingredient, type MakeableResult } from '@cocktailapp/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CocktailCard } from '../../components/CocktailCard';
import { Body, Button, Eyebrow, H1, H2, Muted, Pill, Screen } from '../../components/ui';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';
import { useSettings } from '../../store/settings';

/**
 * "Mijn bar" — the hero. Onboarding until the user builds a bar, then the flagship makeable view:
 * how many cocktails they can make now, plus "bijna" (1 missing) and "twee stapjes weg" (2). Ported
 * from the web `bar.ts`; `computeMakeable` runs on-device against the local cabinet + catalog.
 */
export default function BarScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const catalog = useCatalog((s) => s.catalog);
  const ids = useCabinet((s) => s.ids);
  const cabinetHydrated = useCabinet((s) => s.hydrated);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const wizardDone = useSettings((s) => s.wizardDone);

  const results = useMemo(
    () => (ids.length ? computeMakeable(catalog.cocktails, ids, 2) : []),
    [catalog.cocktails, ids],
  );
  const now = useMemo(() => results.filter((r) => r.missingCount === 0), [results]);
  const almost1 = useMemo(() => results.filter((r) => r.missingCount === 1), [results]);
  const almost2 = useMemo(() => results.filter((r) => r.missingCount === 2), [results]);

  const byId = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const ing of catalog.ingredients) m.set(ing.id, ing);
    return m;
  }, [catalog.ingredients]);
  const selected = useMemo(
    () =>
      ids
        .map((id) => byId.get(id))
        .filter((x): x is Ingredient => !!x)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ids, byId],
  );

  // Avoid an onboarding/real flash before persisted state is loaded.
  const hydrated = cabinetHydrated && settingsHydrated;
  const showOnboarding = hydrated && ids.length === 0 && !wizardDone;

  const surpriseMe = () => {
    if (!now.length) return;
    const pick = now[Math.floor(Math.random() * now.length)];
    track({ type: 'surprise_me', cocktailId: pick.cocktail.id });
    router.push(`/cocktails/${pick.cocktail.id}`);
  };

  if (!hydrated) {
    return (
      <Screen>
        <Muted>Laden…</Muted>
      </Screen>
    );
  }

  if (showOnboarding) {
    return (
      <Screen>
        <Eyebrow>Welkom bij Barkast</Eyebrow>
        <H1 style={{ marginTop: 4 }}>Wat staat er{'\n'}in jouw kast?</H1>
        <Body style={{ marginTop: 8 }}>
          Vink aan wat je in huis hebt — sterke drank, mixers, dat ene flesje achterin — en Barkast
          laat meteen zien welke cocktails je nu kunt maken.
        </Body>
        <View style={styles.cta}>
          <Button label="Stel je bar samen" icon="local-bar" onPress={() => router.push('/bar/wizard')} />
          <Button label="Blader eerst rond" variant="stroked" onPress={() => router.push('/cocktails')} />
        </View>
        <View style={[styles.steps, { borderTopColor: theme.hairline }]}>
          <Step n={1} label="Loop door de secties" />
          <Step n={2} label="Vink je ingrediënten aan" />
          <Step n={3} label="Zie wat je kunt maken" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Mijn bar</Eyebrow>
      <H1>
        Je kunt <H1 style={{ color: theme.accent }}>{now.length}</H1>{' '}
        {now.length === 1 ? 'cocktail' : 'cocktails'} maken
      </H1>
      <Muted>Met de {ids.length} ingrediënten in je bar.</Muted>

      <View style={styles.headActions}>
        <Button label="Bewerk je bar" icon="tune" onPress={() => router.push('/bar/wizard')} />
        {now.length > 0 ? (
          <Button label="Verras me" icon="casino" variant="stroked" onPress={surpriseMe} />
        ) : null}
      </View>

      {selected.length > 0 ? (
        <View style={[styles.cabinet, { borderColor: theme.hairline }]}>
          {selected.slice(0, 24).map((ing) => (
            <Pill key={ing.id} label={ing.name} />
          ))}
          {selected.length > 24 ? <Pill label={`+${selected.length - 24}`} tone="accent" /> : null}
        </View>
      ) : null}

      {now.length > 0 ? (
        <Section title="Nu te maken" count={now.length} tone="ok" results={now} showMissing={false} />
      ) : (
        <View style={[styles.nudge, { backgroundColor: theme.surface2 }]}>
          <Body style={{ fontWeight: '700' }}>Nog niks helemaal compleet.</Body>
          <Muted>Voeg een sterke drank of mixer toe en je bent er zo.</Muted>
          <Button label="Bar aanvullen" variant="stroked" onPress={() => router.push('/bar/wizard')} />
        </View>
      )}

      {almost1.length > 0 ? (
        <Section title="Bijna — je mist er één" count={almost1.length} results={almost1} showMissing />
      ) : null}
      {almost2.length > 0 ? (
        <Section title="Twee stapjes weg" count={almost2.length} results={almost2} showMissing />
      ) : null}
    </Screen>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: theme.accentSoft }]}>
        <Body style={{ color: theme.accent, fontWeight: '800' }}>{n}</Body>
      </View>
      <Muted style={{ flex: 1 }}>{label}</Muted>
    </View>
  );
}

function Section({
  title,
  count,
  results,
  showMissing,
  tone = 'neutral',
}: {
  title: string;
  count: number;
  results: MakeableResult[];
  showMissing: boolean;
  tone?: 'neutral' | 'ok';
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <H2>{title}</H2>
        <Pill label={String(count)} tone={tone} />
      </View>
      <View style={styles.grid}>
        {results.map((r) => (
          <CocktailCard
            key={r.cocktail.id}
            cocktail={r.cocktail}
            missingCount={showMissing ? r.missingCount : 0}
            missingNames={showMissing ? r.missing.map((m) => m.name) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 },
  steps: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  headActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  cabinet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  nudge: { padding: 18, borderRadius: 12, gap: 8, marginTop: 12, alignItems: 'flex-start' },
  block: { marginTop: 20, gap: 12 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
