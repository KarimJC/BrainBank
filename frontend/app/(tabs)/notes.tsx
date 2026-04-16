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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppLayout from '@/components/layout/AppLayout';
import { fetchNotes, fetchCourseSections, NoteItem, CourseSection } from '@/services/notesService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';
import NotesFilterModal from '@/components/notes/NotesFilterModal';
import ErrorView from '@/components/ui/ErrorView';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = 'All' | 'Recent';
const FILTERS: FilterOption[] = ['All', 'Recent'];

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotesListPage() {
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');

  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [selectedCourseSection, setSelectedCourseSection] = useState<CourseSection | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    loadCourseSections();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadNotes();
  }, [debouncedSearch, selectedCourseSection, startDate, endDate]);

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadCourseSections = async () => {
    try {
      const data = await fetchCourseSections();
      setCourseSections(data);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/(auth)/login');
        return;
      }
      console.error('Failed to load course sections:', err);
    }
  };

  const loadNotes = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchNotes({
        search: debouncedSearch || undefined,
        courseSectionId: selectedCourseSection?.course_section_id,
        startDate: startDate ? formatDate(startDate) : undefined,
        endDate: endDate ? formatDate(endDate) : undefined,
      });
      setNotes(data);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/(auth)/login');
        return;
      }
      console.error('Failed to load notes:', err);
      setError(getUserFriendlyMessage(err));
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
    if (route === 'home')         router.push('/(tabs)');
    else if (route === 'notes')   router.push('/(tabs)/notes');
    else if (route === 'chat')    router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const activeFilterCount = [selectedCourseSection, startDate, endDate].filter(Boolean).length;

  const filteredNotes = notes.filter(n => {
    if (activeFilter === 'Recent') {
      const week = new Date();
      week.setDate(week.getDate() - 7);
      if (new Date(n.dateUploaded) < week) return false;
    }
    return true;
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>
        <Text style={styles.header}>My Notes</Text>

        {/* Search */}
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

        {/* Filter Chips + Filter Icon */}
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
            style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconActive]}
            onPress={() => setShowFilters(true)}
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
              {activeFilterCount > 0 || search
                ? 'Try adjusting your search or filters'
                : 'Upload your first note to get started'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            renderItem={({ item }) => <NoteCard note={item} onPress={setSelectedNote} />}
            keyExtractor={item => String(item.noteId)}
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
        onUpdated={updated => {
          setNotes(prev => prev.map(n => (n.noteId === updated.noteId ? updated : n)));
          setSelectedNote(updated);
        }}
        onDeleted={noteId => {
          setNotes(prev => prev.filter(n => n.noteId !== noteId));
          setSelectedNote(null);
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#6B5BC7';

const styles = StyleSheet.create({
  // Layout
  inner: {
    flex: 1,
  },

  // Header
  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
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

  // Filter row
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
  filterIconBtn: {
    padding: 4,
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

  // Notes list
  listContent: {
    paddingTop: 4,
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