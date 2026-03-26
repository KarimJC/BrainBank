import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppLayout from '@/components/layout/AppLayout';
import { fetchNotes, fetchCourseSections, NoteItem, CourseSection } from '../services/notesService';
import { fetchUserProfile } from '@/services/profileService';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';
import NotesFilterModal from '@/components/notes/NotesFilterModal';

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function NotesListPage() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [selectedCourseSection, setSelectedCourseSection] = useState<CourseSection | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    fetchUserProfile().then(u => setProfileImage(u.profile_picture ?? null)).catch(() => {});
    loadCourseSections();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadNotes();
  }, [debouncedSearch, selectedCourseSection, startDate, endDate]);

  const loadCourseSections = async () => {
    try {
      const data = await fetchCourseSections();
      setCourseSections(data);
    } catch (error) {
      console.error('Failed to load course sections:', error);
    }
  };

  const loadNotes = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await fetchNotes({
        search: debouncedSearch || undefined,
        courseSectionId: selectedCourseSection?.course_section_id,
        startDate: startDate ? formatDate(startDate) : undefined,
        endDate: endDate ? formatDate(endDate) : undefined,
      });
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSelectedCourseSection(null);
    setStartDate(null);
    setEndDate(null);
  };

  const handleNavigate = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  const activeFilterCount = [selectedCourseSection, startDate, endDate].filter(Boolean).length;

  return (
    <AppLayout userName="User" profileImage={profileImage} onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>
        <Text style={styles.header}>My Notes</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#6B5BC7'} />
            <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            style={styles.chipsContainer}
          >
            {selectedCourseSection && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{selectedCourseSection.course_code}</Text>
                <TouchableOpacity onPress={() => setSelectedCourseSection(null)}>
                  <Ionicons name="close-circle" size={14} color="#6B5BC7" />
                </TouchableOpacity>
              </View>
            )}
            {startDate && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>From: {formatDate(startDate)}</Text>
                <TouchableOpacity onPress={() => setStartDate(null)}>
                  <Ionicons name="close-circle" size={14} color="#6B5BC7" />
                </TouchableOpacity>
              </View>
            )}
            {endDate && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>To: {formatDate(endDate)}</Text>
                <TouchableOpacity onPress={() => setEndDate(null)}>
                  <Ionicons name="close-circle" size={14} color="#6B5BC7" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B5BC7" />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#E8E5F5" />
            <Text style={styles.emptyText}>No notes found</Text>
            <Text style={styles.emptySubtext}>
              {activeFilterCount > 0 || search
                ? 'Try adjusting your search or filters'
                : 'Upload your first note to get started'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            renderItem={({ item }) => (
              <NoteCard note={item} onPress={setSelectedNote} />
            )}
            keyExtractor={(item) => String(item.noteId)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={() => loadNotes(true)}
            refreshing={refreshing}
          />
        )}
      </View>

      <NoteDetailModal
        note={selectedNote}
        courseSections={courseSections}
        onClose={() => setSelectedNote(null)}
        onUpdated={(updated) => {
          setNotes(prev => prev.map(n => n.noteId === updated.noteId ? updated : n));
          setSelectedNote(updated);
        }}
      />

      <NotesFilterModal
        visible={showFilters}
        selectedCourseSection={selectedCourseSection}
        startDate={startDate}
        endDate={endDate}
        courseSections={courseSections}
        onSelectCourse={setSelectedCourseSection}
        onSelectStartDate={setStartDate}
        onSelectEndDate={setEndDate}
        onReset={clearFilters}
        onClose={() => setShowFilters(false)}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6B5BC7',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#999',
  },
  chipsContainer: {
    marginBottom: 6,
    flexGrow: 0,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 30,
  },
});