import { Stack } from 'expo-router';
import { UserProvider } from '@/contexts/UserContext';
import { CourseSectionsProvider } from '@/contexts/CourseSectionsContext';
import { ConversationsProvider } from '@/contexts/ConversationsContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <UserProvider>
      <CourseSectionsProvider>
        <ConversationsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="conversation/[id]" options={{ animation: 'slide_from_right', headerShown: false }} />
          </Stack>
        </ConversationsProvider>
      </CourseSectionsProvider>
    </UserProvider>
  );
}