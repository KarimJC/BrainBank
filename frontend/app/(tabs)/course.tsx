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
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppLayout from '@/components/layout/AppLayout';
import { fetchNotes, NoteItem } from '@/services/notesService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import NoteCard from '@/components/notes/NoteCard';
import NoteDetailModal from '@/components/notes/NoteDetailModal';
import ErrorView from '@/components/ui/ErrorView';

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
  const [leaving, setLeaving] = useState(false);

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

  const handleLeaveClass = () => {
    Alert.alert(
      'Leave Class',
      `Are you sure you want to leave ${courseCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              const user = await api.getCurrentUser();
              await api.unenrollFromCourseSection(Number(courseId), user.user_id);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to leave class. Please try again.');
              setLeaving(false);
            }
          },
        },
      ]
    );
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
    <AppLayout onNavigate={handleNavigate} activeRoute="notes">
      <View style={styles.inner}>

        {/* ── Back + Bookmark + Leave ── */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#1C1C1E" />
          </TouchableOpacity>
          <View style={styles.topRowRight}>
            <TouchableOpacity onPress={() => setBookmarked(b => !b)}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color="#6750A4"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLeaveClass} style={styles.leaveBtn} disabled={leaving}>
              <Text style={styles.leaveBtnText}>{leaving ? 'Leaving…' : 'Leave'}</Text>
            </TouchableOpacity>
          </View>
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