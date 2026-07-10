import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Mijn bar' }} />
      <Tabs.Screen name="cocktails" options={{ title: 'Cocktails' }} />
      <Tabs.Screen name="kast" options={{ title: 'Mijn kast' }} />
    </Tabs>
  );
}
