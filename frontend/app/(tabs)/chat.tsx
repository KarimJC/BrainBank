import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MOCK_COURSES = [
  { key: 'cs2510', sectionId: '10', code: 'CS 2510', description: 'Fundamentals of Computer Science 2' },
  { key: 'math1201', sectionId: '11', code: 'MATH 1201', description: 'Calculus and Differential Equations' },
];

export default function ChatScreen() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  const openChat = (courseId: string, courseCode: string) => {
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { sectionId: courseId, courseName: courseCode },
    });
  };

  return (
    <AppLayout userName="User" onNavigate={handleNavigation} activeRoute="chat">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.heading}>BrainBot</Text>
          <Text style={styles.subheading}>
            Pick a course to chat with the AI or generate documents from your notes.
          </Text>
          {MOCK_COURSES.map((course) => (
            <View key={course.key} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.courseCode}>{course.code}</Text>
                <Text style={styles.courseDesc}>{course.description}</Text>
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => openChat(course.sectionId, course.code)}
              >
                <IconSymbol name="message" size={18} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>Chat with AI</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#636366',
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#E8E5F5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardInfo: {
    marginBottom: 16,
  },
  courseCode: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  courseDesc: {
    fontSize: 14,
    color: '#636366',
    lineHeight: 19,
  },
  chatButton: {
    backgroundColor: '#6B4CE6',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
