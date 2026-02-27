import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chatbot" options={{ headerShown: false }} />
    </Tabs>
  );
}