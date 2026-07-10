import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: 'Mijn bar' }} />
      <Tabs.Screen name="cocktails" options={{ title: 'Cocktails' }} />
      <Tabs.Screen name="ingredienten" options={{ title: 'Ingrediënten' }} />
    </Tabs>
  );
}
