import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { API_BASE_URL } from '@/services/api';

export interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_title: string;
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
  onAdd: (section: CourseSection) => void;
  alreadyAdded: string[];
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

const AddClassModal: React.FC<Props> = ({ visible, onClose, onAdd, alreadyAdded }) => {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState<string>('ALL');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setActiveSubject('ALL');
    setError(null);
    setLoading(true);

    fetch(`${API_BASE_URL}/api/v1/course-sections`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data: CourseSection[]) => {
        setSections(data);
        setLoading(false);
      })
      .catch((e) => {
        setError('Could not load courses. Make sure the backend is running.');
        setLoading(false);
      });
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
  }, [sections, query, activeSubject]);

  const renderItem = ({ item }: { item: CourseSection }) => {
    const added = alreadyAdded.includes(String(item.course_section_id));
    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowCode}>{item.course_code}</Text>
          <Text style={styles.rowName} numberOfLines={1}>{item.course_name}</Text>
          {item.professor_name ? (
            <Text style={styles.rowProf}>Prof. {item.professor_name}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addButton, added && styles.addButtonDone]}
          onPress={() => !added && onAdd(item)}
          disabled={added}
        >
          <Text style={[styles.addButtonText, added && styles.addButtonTextDone]}>
            {added ? '✓' : '+'}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add a Class</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, CRN, or professor..."
            placeholderTextColor={COLORS.grey}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Subject chips */}
        {subjects.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {subjects.map((subj) => (
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
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>Loading courses…</Text>
          </View>
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
              <View style={styles.centered}>
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
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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

export default AddClassModal;
