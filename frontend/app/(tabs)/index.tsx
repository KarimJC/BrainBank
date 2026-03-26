import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { fetchUserProfile } from '@/services/profileService';
import Svg, { Path } from 'react-native-svg';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Bookmark Icon component with toggle
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

// ClassCard component
interface ClassCardProps {
  classData: {
    id: string;
    code: string;
    description: string;
    bookmarked: boolean;
  };
  onPress: () => void;
  onBookmarkPress: (id: string) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classData, onPress, onBookmarkPress }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.classCode}>{classData.code}</Text>
      <BookmarkIcon 
        filled={classData.bookmarked}
        onPress={() => onBookmarkPress(classData.id)}
      />
    </View>
    <Text style={styles.classDescription}>{classData.description}</Text>
    <TouchableOpacity style={styles.viewNotesButton} onPress={onPress}>
      <IconSymbol 
        name="folder" 
        size={20} 
        color="#FFFFFF" 
      />
      <Text style={styles.viewNotesText}>View All Notes</Text>
    </TouchableOpacity>
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile().then(u => setProfileImage(u.profile_picture ?? null)).catch(() => {});
  }, []);

  // Mock class data with bookmark state
  const [classes, setClasses] = useState([
    { id: '10', code: 'CS 2510', description: 'This is a short description of the class.', bookmarked: true },
    { id: '11', code: 'MATH 1201', description: 'This is a short description of the class.', bookmarked: true },
  ]);

  const handleNavigation = (route: string) => {
    console.log(`Navigating to: ${route}`);
    if (route === 'home') {
      router.push('/(tabs)');
    } else if (route === 'notes') {
      router.push('/(tabs)/notes');
    } else if (route === 'chat') {
      router.push('/(tabs)/chat');
    } else if (route === 'profile') {
      router.push('/(tabs)/profile');
    } else if (route === 'add-class') {
      console.log('Add class clicked');
    } else if (route === 'upload-notes') {
      console.log('Upload notes clicked');
    } else if (route === 'generate-document') {
      console.log('Generate document clicked');
    }
  };

  const handleViewNotes = (classId: string) => {
    const classData = classes.find(c => c.id === classId);
    if (!classData) return;

    router.push({
      pathname: '/(tabs)/course' as any,
      params: {
        courseId: classData.id,
        courseCode: classData.code,
        professorName: classData.description, // bc we dont have prof yet 
      },
    });
  };

  const handleBookmarkToggle = (classId: string) => {
    setClasses(prevClasses => 
      prevClasses.map(cls => 
        cls.id === classId 
          ? { ...cls, bookmarked: !cls.bookmarked }
          : cls
      )
    );
  };

  return (
    <AppLayout
      userName="User"
      profileImage={profileImage}
      onNavigate={handleNavigation}
      activeRoute="home"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.welcome}>
            Welcome, <Text style={styles.userName}>User!</Text>
          </Text>

          {classes.map((classData) => (
            <ClassCard 
              key={classData.id} 
              classData={classData}
              onPress={() => handleViewNotes(classData.id)}
              onBookmarkPress={handleBookmarkToggle}
            />
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
  welcome: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
  },
  userName: {
    color: '#6B5BC7',
  },
  card: {
    backgroundColor: '#E8E5F5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classCode: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  bookmarkTouchable: {
    padding: 4,
  },
  classDescription: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  viewNotesButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  viewNotesText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});