import { MaterialIcons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.hairline },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.ink,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
        headerRight: () => (
          <Link href="/account" asChild>
            <Pressable hitSlop={12} style={{ paddingHorizontal: 16 }} accessibilityLabel="Account">
              <MaterialIcons name="account-circle" size={24} color={theme.ink} />
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mijn bar',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="local-bar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cocktails"
        options={{
          title: 'Cocktails',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="local-drink" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ingredienten"
        options={{
          title: 'Ingrediënten',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="kitchen" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
