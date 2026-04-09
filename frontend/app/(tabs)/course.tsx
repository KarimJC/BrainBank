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
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppLayout from '@/components/layout/AppLayout';
import { fetchNotes, NoteItem } from '@/services/notesService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';

type FilterOption = 'All' | 'Recent' | 'Saved';

const FILTERS: FilterOption[] = ['All', 'Recent', 'Saved'];

export default function CoursePage() {
  const router = useRouter();

  const { courseId, courseCode, professorName } = useLocalSearchParams<{
    courseId: string;
    courseCode: string;
    professorName: string;
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadNotes();
  }, [debouncedSearch, courseId]);

  const loadNotes = async (isRefresh = false) => {
    if (!courseId) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchNotes({
        search: debouncedSearch || undefined,
        courseSectionId: Number(courseId),
      });
      setNotes(data);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/(auth)/login');
        return;
      }
      console.error('Failed to load course notes:', err);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNavigate = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
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
    <AppLayout userName="User" onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>

        {/* ── Back + Bookmark ── */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBookmarked(b => !b)}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color="#6750A4"
            />
          </TouchableOpacity>
        </View>

        {/* ── Course Title ── */}
        <Text style={styles.courseCode}>{courseCode ?? 'Course'}</Text>
        <Text style={styles.professorText}>
          with {professorName ?? 'Professor'}
        </Text>

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

        {/* ── Notes Grid ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B5BC7" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#CC0000" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadNotes()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#E8E5F5" />
            <Text style={styles.emptyText}>No notes found</Text>
            <Text style={styles.emptySubtext}>
              {search
                ? 'Try adjusting your search'
                : 'Upload the first note for this course'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={item => String(item.noteId)}
            renderItem={({ item }) => (
              <NoteCard note={item} onPress={setSelectedNote} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={() => loadNotes(true)}
            refreshing={refreshing}
          />
        )}
      </View>

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
  inner: {
    flex: 1,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
  },

  courseCode: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6750A4',
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
    gap: 8,
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
    backgroundColor: '#6750A4',
    borderColor: '#6750A4',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#49454F',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  filterIconBtn: {
    padding: 4,
  },

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
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