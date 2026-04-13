import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppLayout from '@/components/layout/AppLayout';
import {
  fetchAllNotesByCourseSection,
  fetchNotesByCourse,
  NoteItem,
} from '@/services/notesService';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';
import ErrorView from '@/components/ui/ErrorView';
import ClassmatesModal from '@/components/course/ClassmatesModal';

type FilterOption = 'All' | 'Recent' | 'Saved';
type ViewMode = 'mine' | 'myProfessor' | 'allProfessors';

const FILTERS: FilterOption[] = ['All', 'Recent', 'Saved'];

export default function CoursePage() {
  const router = useRouter();

  const { courseId, courseSectionId, courseCode, professorName, professorId } =
    useLocalSearchParams<{
      courseId: string;        // parent course id  → "all sections" fetch
      courseSectionId: string; // user's section id → "my section" fetch
      courseCode: string;
      professorName: string;
      professorId: string;
    }>();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [bookmarked, setBookmarked] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // classmates 
  const [showClassmates, setShowClassmates] = useState(false);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try{
        const user = await api.getCurrentUser(); 
        setCurrentUserId(user.user_id);
      } catch (error) {
        console.error('Failed to get current user: ', error); 
      }
    }; 
    fetchCurrentUser();
  }, []);

  // Default to showing all sections of the course for this professor
  const [viewMode, setViewMode] = useState<ViewMode>('mine');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reload whenever the view mode or search changes
  useEffect(() => {
    loadNotes();
  }, [debouncedSearch, viewMode]);

  const loadNotes = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      let data: NoteItem[];

      if (viewMode === 'mine') {
        // User's own section only
        if (!courseSectionId) return;
        data = await fetchAllNotesByCourseSection(Number(courseSectionId));
      } else if (viewMode === 'myProfessor') {
        // All sections of this course taught by the same professor
        if (!courseId) return;
        const profId = professorId ? Number(professorId) : undefined;
        data = await fetchNotesByCourse(Number(courseId), profId);
      } else {
        // All sections of this course across all professors
        if (!courseId) return;
        data = await fetchNotesByCourse(Number(courseId));
      }

      // Client-side search filter
      const filtered = debouncedSearch
        ? data.filter(n =>
            n.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (n.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()),
          )
        : data;

      setNotes(filtered);
    } catch (error) {
      console.error('Failed to load course notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClassmates = async () => {
    if (!courseId) return;
    setLoadingClassmates(true);
    try {
      const data = await api.getCourseSectionStudents(Number(courseId));
      setClassmates(data);
      setShowClassmates(true);
    } catch (error) {
      console.error('Failed to load classmates:', error);
      Alert.alert('Error', 'Failed to load classmates');
    } finally {
      setLoadingClassmates(false);
    }
  };

  const handleNavigate = (route: string) => {
    if (route === 'home')   router.push('/(tabs)');
    else if (route === 'notes')   router.push('/(tabs)/notes');
    else if (route === 'chat')    router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  const filteredNotes = notes.filter(n => {
    if (activeFilter === 'Recent') {
      const week = new Date();
      week.setDate(week.getDate() - 7);
      return new Date(n.dateUploaded) >= week;
    }
    return true;
  });
  
  return (
    <AppLayout onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>
        {/* Back + Bookmark + classmates */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#1C1C1E" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={loadClassmates} disabled={loadingClassmates}>
            {loadingClassmates ? (
              <ActivityIndicator size="small" color="#6750A4" />
            ) : (
              <Ionicons name="people-outline" size={22} color="#6750A4" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBookmarked(b => !b)}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color="#6750A4" />
          </TouchableOpacity>
        </View>
      </View>

        {/* ── Course Title ── */}
        <Text style={styles.courseCode}>{courseCode ?? 'Course'}</Text>
        <Text style={styles.professorText}>with {professorName ?? 'Professor'}</Text>

        {/* ── View Mode Toggle ── */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'mine' && styles.toggleBtnActive]}
            onPress={() => setViewMode('mine')}
          >
            <Text style={[styles.toggleText, viewMode === 'mine' && styles.toggleTextActive]}>
              My Section
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'myProfessor' && styles.toggleBtnActive]}
            onPress={() => setViewMode('myProfessor')}
          >
            <Text style={[styles.toggleText, viewMode === 'myProfessor' && styles.toggleTextActive]}>
              My Professor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'allProfessors' && styles.toggleBtnActive]}
            onPress={() => setViewMode('allProfessors')}
          >
            <Text style={[styles.toggleText, viewMode === 'allProfessors' && styles.toggleTextActive]}>
              All Professors
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for notes"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
            clearButtonMode="while-editing"
          />
        </View>

        {/* ── Filter Chips ── */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, activeFilter === f && styles.chipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.filterIconBtn}>
            <Ionicons name="options-outline" size={22} color="#1E1E1E" />
          </TouchableOpacity>
        </View>

        {/* ── Notes List ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B5BC7" />
          </View>
        ) 
         : error ? (
  <ErrorView message={error} onRetry={() => loadNotes()} />
        )

        : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#E8E5F5" />
            <Text style={styles.emptyText}>No notes found</Text>
            <Text style={styles.emptySubtext}>
              {search
                ? 'Try adjusting your search'
                : viewMode === 'mine'
                  ? 'Upload the first note for your section'
                  : viewMode === 'myProfessor'
                    ? 'No notes uploaded in your professor\'s sections yet'
                    : 'No notes have been uploaded for this course yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={item => String(item.noteId)}
            renderItem={({ item }) => <NoteCard note={item} onPress={setSelectedNote} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={() => loadNotes(true)}
            refreshing={refreshing}
          />
        )}
      </View>
      <ClassmatesModal
        visible={showClassmates}
        classmates={classmates}
        currentUserId={currentUserId}
        onClose={() => setShowClassmates(false)}
      />

      <NoteDetailModal
        note={selectedNote}
        courseSections={[]}
        editable={false}
        onClose={() => setSelectedNote(null)}
        onUpdated={updated => {
          setNotes(prev => prev.map(n => n.noteId === updated.noteId ? updated : n));
          setSelectedNote(updated);
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1 },

  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  leaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CC0000',
  },
  leaveBtnText: {
    color: '#CC0000',
    fontSize: 14,
    fontWeight: '600',
  },

  courseCode: {
    fontSize: 28, fontWeight: '600', color: '#6750A4',
    textAlign: 'center', marginBottom: 4,
  },
  professorText: {
    fontSize: 16, fontWeight: '500', color: '#7E7E7E',
    textAlign: 'center', marginBottom: 16,
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
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: '#6750A4' },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#6750A4' },
  toggleTextActive: { color: '#FFFFFF' },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F3FA', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8E5F5',
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#000' },

  // ── Filters ──
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  chipsScroll: { flex: 1 },
  chip: {
    borderWidth: 1, borderColor: '#CAC4D0', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 6, marginRight: 8,
  },
  chipActive: { backgroundColor: '#6750A4', borderColor: '#6750A4' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#49454F' },
  chipTextActive: { color: '#FFFFFF' },
  filterIconBtn: { padding: 4 },

  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 30,
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
});