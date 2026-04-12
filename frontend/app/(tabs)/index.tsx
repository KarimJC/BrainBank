import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/services/api';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import { Ionicons } from '@expo/vector-icons';
import ErrorView from '@/components/ui/ErrorView';

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

interface BookmarkIconProps {
  filled: boolean;
  onPress: () => void;
}

const BookmarkIcon: React.FC<BookmarkIconProps> = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.bookmarkTouchable}>
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 17.5L5 21V5Z"
        fill={filled ? '#000' : 'none'}
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </TouchableOpacity>
);

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
      <BookmarkIcon
        filled={classData.bookmarked}
        onPress={() => onBookmarkPress(String(classData.course_section_id))}
      />
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching user...');
      const user = await api.getCurrentUser();
      console.log('Got user:', user);
      setUserName(user.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : 'User');

      console.log('Fetching course sections...');
      const sections = await api.getUserCourseSections(user.user_id);
      console.log('Got sections:', sections);
      setClasses(sections.map((s: CourseSection) => ({ ...s, bookmarked: false })));
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
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
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
        courseId: String(section.course_section_id),
        courseCode: section.course_code,
        professorName: section.professor_name ?? '',
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
    setClasses(prevClasses =>
      prevClasses.map(cls =>
        String(cls.course_section_id) === classId
          ? { ...cls, bookmarked: !cls.bookmarked }
          : cls
      )
    );
  };

  return (
    <AppLayout onNavigate={handleNavigation} activeRoute="home" onClassAdded={fetchData}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color="#6B5BC7" style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchData} />
            )
           : (
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
});