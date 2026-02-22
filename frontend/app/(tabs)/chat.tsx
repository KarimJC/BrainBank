import { ScrollView } from "react-native";
import AppLayout from "@/components/layout/AppLayout";
import { useRouter } from "expo-router";

export default function ChatScreen() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === "home") {
      router.push("/(tabs)");
    } else if (route === "notes") {
      router.push("/(tabs)/notes");
    } else if (route === "chat") {
      router.push("/(tabs)/chat");
    } else if (route === "profile") {
      router.push("/(tabs)/profile");
    }
  };

  return (
    <AppLayout userName="User" onNavigate={handleNavigation} activeRoute="chat">
      <ScrollView showsVerticalScrollIndicator={false}></ScrollView>
    </AppLayout>
  );
}
