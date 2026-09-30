import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

// Un seul écran : la barre d'onglets est masquée
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'Carte' }} />
    </Tabs>
  );
}
