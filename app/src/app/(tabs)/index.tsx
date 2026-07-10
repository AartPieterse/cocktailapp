import { computeMakeable, type MakeableResult } from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassArt } from '../../components/GlassArt';
import { Body, Button, Eyebrow, H1, Muted } from '../../components/ui';
import { track } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { washFor } from '../../lib/cocktail-visual';
import { FACTS, factIndexForToday } from '../../lib/facts';
import { useTheme } from '../../lib/theme';
import { useCabinet } from '../../store/cabinet';
import { useSettings } from '../../store/settings';
import { useToast } from '../../store/toast';

/**
 * "Voor nu" — the home surface. A hero suggestion (the simplest thing you can make right now), a
 * rotating "Wist je dat?" trivia card, a horizontal rail of other makeable drinks, and a "Bijna
 * binnen bereik" list. Onboarding until the user builds a bar.
 */
export default function BarScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const catalog = useCatalog((s) => s.catalog);
  const ids = useCabinet((s) => s.ids);
  const toggle = useCabinet((s) => s.toggle);
  const toast = useToast((s) => s.show);
  const cabinetHydrated = useCabinet((s) => s.hydrated);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const wizardDone = useSettings((s) => s.wizardDone);

  const [factIdx, setFactIdx] = useState(factIndexForToday);

  const results = useMemo(
    () => (ids.length ? computeMakeable(catalog.cocktails, ids, 1) : []),
    [catalog.cocktails, ids],
  );
  const now = useMemo(
    () =>
      results
        .filter((r) => r.missingCount === 0)
        .sort(
          (a, b) =>
            a.cocktail.ingredients.length - b.cocktail.ingredients.length ||
            a.cocktail.name.localeCompare(b.cocktail.name),
        ),
    [results],
  );
  const almost1 = useMemo(() => results.filter((r) => r.missingCount === 1), [results]);

  const hydrated = cabinetHydrated && settingsHydrated;
  const showOnboarding = hydrated && ids.length === 0 && !wizardDone;

  const addMissing = (r: MakeableResult) => {
    const first = r.missing[0];
    if (!first) return;
    toggle(first.ingredientId, true);
    track({ type: 'cabinet_add', ingredientId: first.ingredientId });
    toast(`${first.name} toegevoegd aan je kast`);
  };

  if (!hydrated) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ padding: 20 }}>
          <Muted>Laden…</Muted>
        </View>
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Eyebrow>Welkom bij Barkast</Eyebrow>
          <H1 style={{ marginTop: 4, fontSize: 40, lineHeight: 42 }}>Wat staat er{'\n'}in jouw kast?</H1>
          <Body style={{ marginTop: 8, color: theme.muted }}>
            Vink aan wat je in huis hebt — sterke drank, mixers, dat ene flesje achterin — en Barkast
            laat meteen zien welke cocktails je nu kunt maken.
          </Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 }}>
            <Button label="Stel je bar samen" icon="local-bar" onPress={() => router.push('/bar/wizard')} />
            <Button label="Blader eerst rond" variant="stroked" onPress={() => router.push('/cocktails')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hero = now[0]?.cocktail;
  const rest = now.slice(1);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        {/* top row */}
        <View style={styles.topRow}>
          <Text style={[styles.pageTitle, { color: theme.ink, fontFamily: theme.fontDisplay }]}>Voor nu</Text>
          <View style={styles.topRight}>
            <View style={[styles.badge, { backgroundColor: theme.okSoft }]}>
              <Text style={{ color: theme.ok, fontWeight: '600', fontSize: 12 }}>{now.length} te maken</Text>
            </View>
            <Pressable
              onPress={() => router.push('/account')}
              style={[styles.gear, { backgroundColor: theme.surface2 }]}
              accessibilityLabel="Instellingen"
            >
              <MaterialIcons name="settings" size={19} color={theme.muted} />
            </Pressable>
          </View>
        </View>

        {/* hero card */}
        {hero ? (
          <Pressable
            onPress={() => router.push(`/cocktails/${hero.id}`)}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: washFor(hero, 0.5), transform: [{ scale: pressed ? 0.975 : 1 }] },
            ]}
          >
            <GlassArt cocktail={hero} height={172} />
            <Text style={[styles.heroName, { color: theme.ink, fontFamily: theme.fontDisplay }]}>{hero.name}</Text>
            {hero.description ? (
              <Text style={[styles.heroDesc, { color: theme.muted }]} numberOfLines={2}>
                {hero.description}
              </Text>
            ) : null}
            <Text style={[styles.heroCta, { color: theme.accent }]}>Bekijk recept →</Text>
          </Pressable>
        ) : (
          <View style={[styles.nudge, { backgroundColor: theme.surface }]}>
            <Body style={{ fontWeight: '700' }}>Nog niks helemaal compleet.</Body>
            <Muted>Voeg een sterke drank of mixer toe en je bent er zo.</Muted>
            <Button label="Kast aanvullen" variant="stroked" onPress={() => router.push('/kast')} />
          </View>
        )}

        {/* fact card */}
        <Pressable
          onPress={() => setFactIdx((i) => (i + 1) % FACTS.length)}
          style={({ pressed }) => [
            styles.fact,
            { backgroundColor: theme.surface, borderColor: theme.hairline, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <View style={styles.factHead}>
            <View style={[styles.factBadge, { backgroundColor: theme.accentSoft }]}>
              <MaterialIcons name="auto-awesome" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.factEyebrow, { color: theme.accent }]}>WIST JE DAT?</Text>
          </View>
          <Text style={[styles.factText, { color: theme.ink, fontFamily: theme.fontDisplay }]}>{FACTS[factIdx]}</Text>
          <Text style={[styles.factNext, { color: theme.accent }]}>Nog een weetje →</Text>
        </Pressable>

        {/* rail */}
        {rest.length ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.dim }]}>OOK NU TE MAKEN</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20, marginTop: 12 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {rest.map((r) => (
                <Pressable
                  key={r.cocktail.id}
                  onPress={() => router.push(`/cocktails/${r.cocktail.id}`)}
                  style={[styles.mini, { backgroundColor: washFor(r.cocktail, 0.74) }]}
                >
                  <GlassArt cocktail={r.cocktail} height={84} />
                  <Text style={[styles.miniName, { color: theme.ink, fontFamily: theme.fontDisplay }]} numberOfLines={1}>
                    {r.cocktail.name}
                  </Text>
                  <Text style={[styles.miniMeta, { color: theme.faint }]} numberOfLines={1}>
                    {r.cocktail.method ? r.cocktail.method.toUpperCase() : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* almost */}
        {almost1.length ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.dim, marginTop: 30 }]}>BIJNA BINNEN BEREIK</Text>
            <View style={{ marginTop: 12, gap: 12 }}>
              {almost1.map((r) => (
                <View key={r.cocktail.id} style={[styles.almost, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
                  <Pressable onPress={() => router.push(`/cocktails/${r.cocktail.id}`)} style={styles.almostGlass}>
                    <GlassArt cocktail={r.cocktail} width={44} height={56} />
                  </Pressable>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.almostName, { color: theme.ink, fontFamily: theme.fontDisplay }]} numberOfLines={1}>
                      {r.cocktail.name}
                    </Text>
                    <Text style={{ color: theme.faint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      je mist {r.missing[0]?.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => addMissing(r)} style={[styles.addBtn, { backgroundColor: theme.accent }]}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12.5 }}>+ Voeg toe</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  gear: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 26, padding: 22, paddingTop: 26, marginTop: 16, alignItems: 'center' },
  heroName: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginTop: 6, textAlign: 'center' },
  heroDesc: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  heroCta: { fontSize: 13, fontWeight: '600', marginTop: 14 },
  nudge: { padding: 20, borderRadius: 22, gap: 8, marginTop: 16, alignItems: 'flex-start' },
  fact: { marginTop: 24, borderRadius: 22, borderWidth: 1, padding: 20 },
  factHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  factBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  factEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  factText: { fontSize: 19, lineHeight: 26, marginTop: 12, fontWeight: '500' },
  factNext: { fontSize: 12, fontWeight: '600', marginTop: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, marginTop: 26 },
  mini: { width: 150, borderRadius: 18, padding: 14 },
  miniName: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  miniMeta: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, marginTop: 2 },
  almost: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 14 },
  almostGlass: { width: 44, height: 56 },
  almostName: { fontSize: 17, fontWeight: '600' },
  addBtn: { borderRadius: 11, paddingVertical: 10, paddingHorizontal: 14 },
});
