import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseSection } from '@/app/services/notesService';

interface NotesFilterModalProps {
  visible: boolean;
  selectedCourseSection: CourseSection | null;
  startDate: Date | null;
  endDate: Date | null;
  onOpenCoursePicker: () => void;
  onOpenStartDate: () => void;
  onOpenEndDate: () => void;
  onReset: () => void;
  onClose: () => void;
}

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function NotesFilterModal({
  visible,
  selectedCourseSection,
  startDate,
  endDate,
  onOpenCoursePicker,
  onOpenStartDate,
  onOpenEndDate,
  onReset,
  onClose,
}: NotesFilterModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={() => { onReset(); onClose(); }}>
              <Text style={styles.doneText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            <Text style={styles.filterLabel}>Course Section</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => { onClose(); onOpenCoursePicker(); }}
            >
              <Text style={[styles.inputText, !selectedCourseSection && styles.placeholder]}>
                {selectedCourseSection
                  ? `${selectedCourseSection.course_code} ${selectedCourseSection.course_title}`
                  : 'All courses'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B5BC7" />
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Date Range</Text>
            <TouchableOpacity style={styles.input} onPress={onOpenStartDate}>
              <Text style={[styles.inputText, !startDate && styles.placeholder]}>
                {startDate ? `From: ${formatDate(startDate)}` : 'Start date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.input, { marginTop: 10 }]} onPress={onOpenEndDate}>
              <Text style={[styles.inputText, !endDate && styles.placeholder]}>
                {endDate ? `To: ${formatDate(endDate)}` : 'End date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5F5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  doneText: {
    fontSize: 16,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  applyButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    margin: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});