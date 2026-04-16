import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useFocusEffect , useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/services/api';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import { Ionicons } from '@expo/vector-icons';
import ErrorView from '@/components/ui/ErrorView';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_crn: number;
  professor_id?: number | null;
  professor_name?: string | null;
  course_code: string;
  course_name: string;
  subject?: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ClassCardProps {
  classData: CourseSection;
  onPress: () => void;
  onAiPress: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classData, onPress, onAiPress }) => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.cardInfo}>
        <Text style={styles.classCode}>{classData.course_code}</Text>
        <Text style={styles.classDescription}>{classData.course_name}</Text>
        {classData.professor_name ? (
          <Text style={styles.professorName}>with {classData.professor_name}</Text>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.aiButton} onPress={onAiPress}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
    <TouchableOpacity style={styles.viewNotesButton} onPress={onPress}>
      <IconSymbol name="folder" size={16} color="#FFFFFF" />
      <Text style={styles.viewNotesText}>View Notes</Text>
    </TouchableOpacity>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [classes, setClasses] = useState<CourseSection[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.getCurrentUser();
      setUserName(user.first_name ?? user.neu_email ?? 'there');
      const sections = await api.getUserCourseSections(user.user_id);
      setClasses(sections);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/(auth)/login');
        return;
      }
      console.error('Fetch failed:', err);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const handleNavigation = (route: string) => {
    if (route === 'home')         router.push('/(tabs)');
    else if (route === 'notes')   router.push('/(tabs)/notes');
    else if (route === 'chat')    router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
    else {
      console.warn(`Unhandled route: ${route}`);
      Alert.alert('Coming Soon', `${route} is not available yet.`);
    }
  };

  const handleViewNotes = (section: CourseSection) => {
    router.push({
      pathname: '/(tabs)/course',
      params: {
        courseId:        String(section.course_id),
        courseSectionId: String(section.course_section_id),
        courseCode:      section.course_code,
        professorName:   section.professor_name ?? '',
        professorId:     String(section.professor_id ?? ''),
      },
    });
  };

  const handleOpenAiChat = (classId: string, classCode: string) => {
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { sectionId: classId, courseName: classCode },
    });
  };

  return (
    <AppLayout onNavigate={handleNavigation} activeRoute="home" onClassAdded={fetchData}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchData} />
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
                    onAiPress={() =>
                      handleOpenAiChat(String(classData.course_section_id), classData.course_code)
                    }
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#6B5BC7';

const styles = StyleSheet.create({
  // Layout
  container: {
    paddingVertical: 20,
  },
  loader: {
    marginTop: 40,
  },

  // Typography
  welcome: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
  },
  userName: {
    color: PURPLE,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },

  // Card
  card: {
    backgroundColor: '#E8E5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  classDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 2,
  },
  professorName: {
    fontSize: 12,
    color: PURPLE,
    fontWeight: '500',
  },

  // Buttons
  viewNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewNotesText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  aiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE,
    borderRadius: 20,
    width: 34,
    height: 34,
  },
});