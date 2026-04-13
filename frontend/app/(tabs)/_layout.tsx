import { Tabs } from 'expo-router';
import { UserProvider } from '@/contexts/UserContext';

export default function TabLayout() {
  return (
    <UserProvider>
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
      <Tabs.Screen name="course" options={{ headerShown: false }} />
    </Tabs>
    </UserProvider>
  );
}