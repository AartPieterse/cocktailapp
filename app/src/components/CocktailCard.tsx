import type { Cocktail } from '@cocktailapp/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { useFavorites } from '../store/favorites';

/**
 * A cocktail tile for the grids on the Bar and Cocktails screens. Shows a thumbnail (or a themed
 * letter placeholder when there's no image), the name, an optional "mist er nog N" hint for
 * almost-makeable drinks, and a favorite toggle. Tapping opens the detail route.
 */
export function CocktailCard({
  cocktail,
  missingCount,
  missingNames,
}: {
  cocktail: Cocktail;
  missingCount?: number;
  missingNames?: string[];
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const isFav = useFavorites((s) => s.ids.includes(cocktail.id));
  const toggleFav = useFavorites((s) => s.toggle);

  const missingLabel =
    missingCount && missingCount > 0
      ? missingNames?.length
        ? `Mist: ${missingNames.join(', ')}`
        : `Mist er nog ${missingCount}`
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/cocktails/${cocktail.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.hairline, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.media, { backgroundColor: theme.surface2 }]}>
        {cocktail.imageUrl ? (
          <Image source={{ uri: cocktail.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={[styles.placeholder, { color: theme.faint }]}>
            {cocktail.name.charAt(0).toUpperCase()}
          </Text>
        )}
        <Pressable
          onPress={() => toggleFav(cocktail.id)}
          hitSlop={10}
          style={[styles.fav, { backgroundColor: theme.bg }]}
          accessibilityRole="button"
          accessibilityLabel={isFav ? 'Verwijder favoriet' : 'Bewaar favoriet'}
        >
          <MaterialIcons
            name={isFav ? 'favorite' : 'favorite-border'}
            size={18}
            color={isFav ? theme.accent : theme.muted}
          />
        </Pressable>
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>
        {cocktail.name}
      </Text>
      {missingLabel ? (
        <Text numberOfLines={1} style={[styles.missing, { color: theme.muted }]}>
          {missingLabel}
        </Text>
      ) : cocktail.description ? (
        <Text numberOfLines={1} style={[styles.missing, { color: theme.muted }]}>
          {cocktail.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 150, borderWidth: 1, borderRadius: 12, padding: 10, gap: 6, minWidth: 150 },
  media: {
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { fontSize: 44, fontWeight: '800' },
  fav: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700' },
  missing: { fontSize: 13 },
});
