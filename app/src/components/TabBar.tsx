import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { track } from '../lib/analytics';
import { useCatalog } from '../lib/catalog';
import { useTheme } from '../lib/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** The subset of the navigator's tab-bar props this component reads. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

interface Item {
  label: string;
  icon: IconName;
  route?: string; // tab route name to navigate to
  surprise?: boolean; // fires a random cocktail instead of switching tab
}

const ITEMS: Item[] = [
  { label: 'Mijn bar', icon: 'local-bar', route: 'index' },
  { label: 'Cocktails', icon: 'format-list-bulleted', route: 'cocktails' },
  { label: 'Verras me', icon: 'shuffle', surprise: true },
  { label: 'Mijn kast', icon: 'inventory-2', route: 'kast' },
];

/**
 * The Barkast bottom nav: Mijn bar · Cocktails · Verras me · Mijn kast. "Verras me" is an action
 * (opens a random cocktail) rather than a tab, so we render a custom bar instead of the default.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const catalog = useCatalog((s) => s.catalog);
  const activeName = state.routes[state.index]?.name;

  const surprise = () => {
    const list = catalog.cocktails;
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    track({ type: 'surprise_me', cocktailId: pick.id });
    router.push(`/cocktails/${pick.id}`);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.hairline,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {ITEMS.map((item) => {
        const active = !item.surprise && item.route === activeName;
        const color = active ? theme.navActive : theme.navInactive;
        const onPress = () => {
          if (item.surprise) surprise();
          else if (item.route) navigation.navigate(item.route);
        };
        return (
          <Pressable
            key={item.label}
            onPress={onPress}
            style={({ pressed }) => [styles.item, { transform: [{ scale: pressed ? 0.86 : 1 }] }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
          >
            <MaterialIcons name={item.icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  label: { fontSize: 10, fontWeight: '600' },
});
