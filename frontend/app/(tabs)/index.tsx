import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/services/api';

interface CourseSection {
  course_name: string;
  course_title: string;
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
  onBookmarkPress: (name: string) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classData, onPress, onBookmarkPress }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.classCode}>{classData.course_name}</Text>
      <BookmarkIcon
        filled={classData.bookmarked}
        onPress={() => onBookmarkPress(classData.course_name)}
      />
    </View>
    <Text style={styles.classDescription}>{classData.course_title}</Text>
    <TouchableOpacity style={styles.viewNotesButton} onPress={onPress}>
      <IconSymbol name="folder" size={20} color="#FFFFFF" />
      <Text style={styles.viewNotesText}>View All Notes</Text>
    </TouchableOpacity>
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
        console.log('Fetching user...');
        const user = await api.getCurrentUser();
        console.log('Got user:', user);
        setUserName(user.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : 'User');

        console.log('Fetching course sections...');
        const sections = await api.getUserCourseSections(user.user_id);
        console.log('Got sections:', sections);
        setClasses(sections.map((s: CourseSection) => ({ ...s, bookmarked: false })));
      } catch (err) {
        console.error('Fetch failed:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNavigation = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  const handleViewNotes = (courseName: string) => {
    console.log(`Viewing notes for class: ${courseName}`);
  };

  const handleBookmarkToggle = (courseName: string) => {
    setClasses(prev =>
      prev.map(cls =>
        cls.course_name === courseName ? { ...cls, bookmarked: !cls.bookmarked } : cls
      )
    );
  };

  return (
    <AppLayout userName={userName} onNavigate={handleNavigation} activeRoute="home">
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
                    key={classData.course_name}
                    classData={classData}
                    onPress={() => handleViewNotes(classData.course_name)}
                    onBookmarkPress={handleBookmarkToggle}
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
  viewNotesButton: { backgroundColor: '#6B5BC7', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  viewNotesText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginLeft: 8 },
  errorText: { color: '#CC0000', fontSize: 16, textAlign: 'center', marginTop: 40 },
  emptyText: { color: '#666666', fontSize: 16, textAlign: 'center', marginTop: 40 },
});