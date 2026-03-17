import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,  // Hide header (AppLayout has its own)
        tabBarStyle: {
          display: 'none',   // Hide default tabs (using custom BottomNav)
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chatbot" options={{ headerShown: false }} />
      <Tabs.Screen name="course" options={{ headerShown: false }} />
    </Tabs>
  );
}