// ==========================================
// app/index.tsx - Splash Screen with Vault Animation + Login
// ==========================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, AuthRequiredError } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_crn: number;
  professor_id?: number | null;
  professor_name?: string | null;
  course_code: string;
  course_name: string;
  subject?: string | null;
  bookmarked: boolean;
}

interface ClassCardProps {
  classData: CourseSection;
  onPress: () => void;
  onBookmarkPress: (id: string) => void;
  onAiPress: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classData, onPress, onBookmarkPress, onAiPress }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.classCode}>{classData.course_code}</Text>
    </View>
    <Text style={styles.classDescription}>{classData.course_name}</Text>
    <View style={styles.buttonRow}>
      <TouchableOpacity style={styles.viewNotesButton} onPress={onPress}>
        <IconSymbol name="folder" size={20} color="#FFFFFF" />
        <Text style={styles.viewNotesText}>View All Notes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.aiButton} onPress={onAiPress}>
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const [classes, setClasses] = useState<CourseSection[]>([]);
  const [userName, setUserName] = useState('User');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = await api.getCurrentUser();
        setUserName(user.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : 'User');
        const sections = await api.getUserCourseSections(user.user_id);
        setClasses(sections.map((s: CourseSection) => ({ ...s, bookmarked: false })));
      } catch (err) {
        if (err instanceof AuthRequiredError) { router.replace('/(auth)/login'); return; }
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        if (msg.includes('Not authenticated')) { router.replace('/(auth)/login'); return; }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNavigation = (route: string) => {
    if (route === 'home')    router.push('/(tabs)');
    else if (route === 'notes')    router.push('/(tabs)/notes');
    else if (route === 'chat')     router.push('/(tabs)/chat');
    else if (route === 'profile')  router.push('/(tabs)/profile');
  };

  const handleViewNotes = (section: CourseSection) => {
    router.push({
      pathname: '/(tabs)/course',
      params: {
        // course_id is the parent course — used for the "all sections" view
        courseId: String(section.course_id),
        // course_section_id is the user's own section — used for "my section" view
        courseSectionId: String(section.course_section_id),
        courseCode: section.course_code,
        professorName: section.professor_name ?? '',
        // pass professor_id so the backend can scope "all sections" to this professor
        professorId: section.professor_id != null ? String(section.professor_id) : '',
      },
    });
  };

  const handleOpenAiChat = (classId: string, classCode: string) => {
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { sectionId: classId, courseName: classCode },
    });
  };

  const handleBookmarkToggle = (classId: string) => {
    setClasses(prev =>
      prev.map(cls =>
        String(cls.course_section_id) === classId ? { ...cls, bookmarked: !cls.bookmarked } : cls,
      ),
    );
  };

  return (
    <AppLayout onNavigate={handleNavigation} activeRoute="home">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color="#6B5BC7" style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.welcome}>
                Welcome, <Text style={styles.userName}>{userName}!</Text>
              </Text>
              {classes.length === 0 ? (
                <Text style={styles.emptyText}>No classes yet. Add one to get started!</Text>
              ) : (
                classes.map(classData => (
                  <ClassCard
                    key={classData.course_section_id}
                    classData={classData}
                    onPress={() => handleViewNotes(classData)}
                    onBookmarkPress={handleBookmarkToggle}
                    onAiPress={() => handleOpenAiChat(String(classData.course_section_id), classData.course_code)}
                  />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 20 },
  welcome: { fontSize: 32, fontWeight: '600', color: '#000', marginBottom: 24 },
  userName: { color: '#6B5BC7' },
  card: { backgroundColor: '#E8E5F5', borderRadius: 24, padding: 24, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  classCode: { fontSize: 24, fontWeight: '600', color: '#000' },
  bookmarkTouchable: { padding: 4 },
  classDescription: { fontSize: 15, color: '#666666', marginBottom: 20, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewNotesButton: { backgroundColor: '#6B5BC7', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  aiButton: { backgroundColor: '#6B5BC7', borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewNotesText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginLeft: 8 },
  errorText: { color: '#CC0000', fontSize: 16, textAlign: 'center', marginTop: 40 },
  emptyText: { color: '#666666', fontSize: 16, textAlign: 'center', marginTop: 40 },
});