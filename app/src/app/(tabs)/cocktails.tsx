import { ScrollView, StyleSheet, Text } from 'react-native';
import { catalog } from '../../lib/catalog';

// Placeholder list — the full search / tag filter / detail screens come in a later step.
export default function CocktailsScreen() {
  const cocktails = [...catalog.cocktails].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Cocktails ({cocktails.length})</Text>
      {cocktails.map((c) => (
        <Text key={c.id} style={styles.item}>
          • {c.name}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  item: { fontSize: 15, lineHeight: 22 },
});
