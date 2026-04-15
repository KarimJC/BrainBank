import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { API_BASE_URL, api } from '@/services/api';
import { SkeletonList } from '@/components/ui/SkeletonRow';

export interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_crn: number;
  professor_id: number | null;
  professor_name: string | null;
  course_code: string;
  course_name: string;
  subject: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onClassAdded?: () => void;
}

const COLORS = {
  purple: '#6B5BC7',
  lightPurple: '#E8E5F5',
  white: '#FFFFFF',
  black: '#1C1C1E',
  grey: '#636366',
  lightGrey: '#F2F2F7',
  border: '#E5E5EA',
};

const SearchClassModal: React.FC<Props> = ({ visible, onClose, onClassAdded }) => {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [enrolledCodes, setEnrolledCodes] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState<string>('ALL');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setActiveSubject('ALL');
    setError(null);
    setPendingIds(new Set());
    setLoading(true);

    const loadData = async () => {
      try {
        const [sectionsRes, user] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/course-sections`),
          api.getCurrentUser(),
        ]);

        if (!sectionsRes.ok) throw new Error(`Server error ${sectionsRes.status}`);
        const allSections: CourseSection[] = await sectionsRes.json();

        const userSections = await api.getUserCourseSections(user.user_id);
        const ids = new Set<number>(userSections.map((s: CourseSection) => s.course_section_id));
        const codes = new Set<string>(userSections.map((s: CourseSection) => s.course_code));

        setSections(allSections);
        setEnrolledIds(ids);
        setEnrolledCodes(codes);
        setUserId(user.user_id);
      } catch (e) {
        setError('Could not load courses. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((s) => {
      if (s.subject) set.add(s.subject);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [sections]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return sections.filter((s) => {
      if (enrolledIds.has(s.course_section_id) || enrolledCodes.has(s.course_code)) return false;
      const matchesSubject = activeSubject === 'ALL' || s.subject === activeSubject;
      if (!matchesSubject) return false;
      if (!q) return true;
      return (
        s.course_code.toLowerCase().includes(q) ||
        s.course_name.toLowerCase().includes(q) ||
        (s.professor_name ?? '').toLowerCase().includes(q) ||
        String(s.course_crn).includes(q)
      );
    });
  }, [sections, query, activeSubject, enrolledIds, enrolledCodes]);

  const handleToggle = (item: CourseSection) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.course_section_id)) {
        next.delete(item.course_section_id);
      } else {
        next.add(item.course_section_id);
      }
      return next;
    });
  };

  const handleDone = async () => {
    if (pendingIds.size === 0) {
      onClose();
      return;
    }
    if (!userId) return;
    setConfirming(true);
    try {
      await Promise.all(
        Array.from(pendingIds).map((id) => api.enrollInCourseSection(id, userId))
      );
      if (onClassAdded) onClassAdded();
    } catch (e) {
      Alert.alert('Error', 'Could not enroll in one or more classes. Please try again.');
    } finally {
      setConfirming(false);
      onClose();
    }
  };

  const renderItem = ({ item }: { item: CourseSection }) => {
    const pending = pendingIds.has(item.course_section_id);
    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowCode}>{item.course_code}</Text>
          <Text style={styles.rowName} numberOfLines={1}>{item.course_name}</Text>
          <Text style={styles.rowCrn}>CRN: {item.course_crn}</Text>
          {item.professor_name ? (
            <Text style={styles.rowProf}>Prof. {item.professor_name}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addButton, pending && styles.addButtonDone]}
          onPress={() => handleToggle(item)}
          disabled={confirming}
        >
          <Text style={[styles.addButtonText, pending && styles.addButtonTextDone]}>
            {pending ? '✓' : '+'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add a Class</Text>
          <TouchableOpacity onPress={handleDone} style={styles.closeButton} disabled={confirming}>
            <Text style={styles.closeText}>{confirming ? 'Saving…' : 'Done'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, or CRN..."
            placeholderTextColor={COLORS.grey}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {subjects.length > 1 && subjects.map((subj) => (
            <TouchableOpacity
              key={subj}
              style={[styles.chip, activeSubject === subj && styles.chipActive]}
              onPress={() => setActiveSubject(subj)}
            >
              <Text style={[styles.chipText, activeSubject === subj && styles.chipTextActive]}>
                {subj}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.course_section_id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No classes match your search.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.black,
  },
  chipsScroll: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexShrink: 0,
  },
  chipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.purple,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purple,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 2,
  },
  rowName: {
    fontSize: 13,
    color: COLORS.grey,
    marginBottom: 2,
  },
  rowCrn: {
    fontSize: 12,
    color: COLORS.grey,
    marginBottom: 2,
  },
  rowProf: {
    fontSize: 12,
    color: COLORS.grey,
    opacity: 0.8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDone: {
    backgroundColor: COLORS.lightPurple,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },
  addButtonTextDone: {
    color: COLORS.purple,
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 0,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.grey,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.grey,
    textAlign: 'center',
  },
});

export default SearchClassModal;
