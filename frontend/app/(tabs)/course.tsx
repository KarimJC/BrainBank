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
  CourseSection,
} from '@/services/notesService';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';
import ErrorView from '@/components/ui/ErrorView';
import NotesFilterModal from '@/components/notes/NotesFilterModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = 'All' | 'Recent';
type ViewMode = 'mine' | 'myProfessor' | 'allProfessors';

const FILTERS: FilterOption[] = ['All', 'Recent'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CoursePage() {
  const router = useRouter();

  const { courseId, courseSectionId, courseCode, professorName, professorId } =
    useLocalSearchParams<{
      courseId: string;
      courseSectionId: string;
      courseCode: string;
      professorName: string;
      professorId: string;
    }>();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mine');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');

  // Filter modal
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCourseSection, setFilterCourseSection] = useState<CourseSection | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadNotes();
  }, [debouncedSearch, viewMode, courseSectionId]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUserId(user.user_id);
      } catch (err) {
        console.error('Failed to get current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadNotes = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      let data: NoteItem[];

      if (viewMode === 'mine') {
        if (!courseSectionId) return;
        console.log(professorName, professorId)
        data = await fetchAllNotesByCourseSection(Number(courseSectionId));
      } else if (viewMode === 'myProfessor') {
        if (!courseId) return;
        const profId = professorId ? Number(professorId) : undefined;
        data = await fetchNotesByCourse(Number(courseId), profId);
      } else {
        if (!courseId) return;
        data = await fetchNotesByCourse(Number(courseId));
      }

      setNotes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notes. Please try again.';
      console.error('Failed to load course notes:', err);
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnenroll = () => {
    Alert.alert(
      'Unenroll from Course',
      `Are you sure you want to unenroll from ${courseCode ?? 'this course'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unenroll',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUserId) throw new Error('User not found');
              await api.unenrollFromCourseSection(Number(courseSectionId), currentUserId);
              router.back();
            } catch (err) {
              console.error('Failed to unenroll:', err);
              Alert.alert('Error', 'Failed to unenroll. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const handleNavigate = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const activeFilterCount = [filterCourseSection, filterStartDate, filterEndDate].filter(Boolean).length;

  const filteredNotes = notes.filter(n => {
    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch =
        n.title.toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Chip filter
    if (activeFilter === 'Recent') {
      const week = new Date();
      week.setDate(week.getDate() - 7);
      if (new Date(n.dateUploaded) < week) return false;
    }

    // Modal filter: course section
    if (filterCourseSection && n.courseSectionId !== filterCourseSection.course_section_id) {
      return false;
    }

    // Modal filter: date range
    if (filterStartDate && new Date(n.dateUploaded) < filterStartDate) return false;
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(n.dateUploaded) > end) return false;
    }

    return true;
  });

  // Build course section list for the filter modal from loaded notes
  const availableCourseSections: CourseSection[] = Array.from(
    new Map(
      notes
        .filter(n => n.courseSectionId != null)
        .map(n => [
          n.courseSectionId,
          {
            course_section_id: n.courseSectionId!,
            course_id: Number(courseId),
            course_crn: 0,
            professor_id: null,
            course_code: n.courseCode ?? '',
            course_name: n.courseName ?? '',
            subject: null,
            professor_name: n.professorName ?? null,
          } as CourseSection,
        ]),
    ).values(),
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>

        {/* Top Row */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.topRowRight}>

            <TouchableOpacity style={styles.iconBtn} onPress={handleUnenroll}>
              <Ionicons name="trash-outline" size={22} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Course Header */}
        <Text style={styles.courseCode}>{courseCode ?? 'Course'}</Text>
        <Text style={styles.professorText}>with {professorName ?? 'Professor'}</Text>

        {/* View Mode Toggle */}
        <View style={styles.toggleRow}>
          {(['mine', 'myProfessor', 'allProfessors'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                {mode === 'mine' ? 'My Section' : mode === 'myProfessor' ? 'My Professor' : 'All Professors'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
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

        {/* Filter Chips */}
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
          <TouchableOpacity
            style={[styles.iconBtn, activeFilterCount > 0 && styles.filterIconActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={activeFilterCount > 0 ? '#FFF' : '#1C1C1E'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes List */}
        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : error ? (
          <ErrorView message={error} onRetry={() => loadNotes()} />
        ) : filteredNotes.length === 0 ? (
          <View style={styles.centeredContainer}>
            <Ionicons name="document-text-outline" size={64} color="#E8E5F5" />
            <Text style={styles.emptyText}>No notes found</Text>
            <Text style={styles.emptySubtext}>
              {debouncedSearch || activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : viewMode === 'mine'
                  ? 'Upload the first note for your section'
                  : viewMode === 'myProfessor'
                    ? "No notes uploaded in your professor's sections yet"
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

      {/* Filter Modal */}
      <NotesFilterModal
        visible={showFilterModal}
        startDate={filterStartDate}
        endDate={filterEndDate}
        onSelectStartDate={setFilterStartDate}
        onSelectEndDate={setFilterEndDate}
        onReset={() => {
          setFilterStartDate(null);
          setFilterEndDate(null);
        }}
        onClose={() => setShowFilterModal(false)}
      />

      <NoteDetailModal
        note={selectedNote}
        courseSections={[]}
        editable={false}
        onClose={() => setSelectedNote(null)}
        onUpdated={updated => {
          setNotes(prev => prev.map(n => (n.noteId === updated.noteId ? updated : n)));
          setSelectedNote(updated);
        }}
      />
    </AppLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#6B5BC7';

const styles = StyleSheet.create({
  // Layout
  inner: {
    flex: 1,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topRowRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },

  // Course Header
  courseCode: {
    fontSize: 28,
    fontWeight: '600',
    color: PURPLE,
    textAlign: 'center',
    marginBottom: 4,
  },
  professorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7E7E7E',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F5F3FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: PURPLE,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: PURPLE,
  },
  toggleTextActive: {
    color: '#FFF',
  },

  // Search
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

  // Filter Chips
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chipsScroll: {
    flex: 1,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CAC4D0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#49454F',
  },
  chipTextActive: {
    color: '#FFF',
  },
  filterIconActive: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    padding: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E53935',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Notes List
  listContent: {
    paddingBottom: 30,
  },

  // Empty / Loading
  centeredContainer: {
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
    paddingHorizontal: 32,
  },
});