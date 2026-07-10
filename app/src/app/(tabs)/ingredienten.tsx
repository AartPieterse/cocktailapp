import { ScrollView, StyleSheet, Text } from 'react-native';
import { catalog } from '../../lib/catalog';

// Placeholder list — grouping by category + cabinet toggles come in a later step.
export default function IngredientenScreen() {
  const ingredients = [...catalog.ingredients].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Ingrediënten ({ingredients.length})</Text>
      {ingredients.map((i) => (
        <Text key={i.id} style={styles.item}>
          • {i.name}
          {i.isStaple ? '  (basis)' : ''}
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
