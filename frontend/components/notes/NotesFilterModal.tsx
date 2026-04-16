import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  Pressable,

} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CourseSection } from '@/services/notesService';

interface NotesFilterModalProps {
  visible: boolean;
  selectedCourseSection: CourseSection | null;
  startDate: Date | null;
  endDate: Date | null;
  courseSections: CourseSection[];
  onSelectCourse: (section: CourseSection | null) => void;
  onSelectStartDate: (date: Date | null) => void;
  onSelectEndDate: (date: Date | null) => void;
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
  courseSections,
  onSelectCourse,
  onSelectStartDate,
  onSelectEndDate,
  onReset,
  onClose,
}: NotesFilterModalProps) {
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleClose = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowCoursePicker(false);
    onClose();
  };

  const handleReset = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowCoursePicker(false);
    onReset();
    onClose();
  };

  const courseOptions: (CourseSection | null)[] = [null, ...courseSections];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.actionText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

            {/* ── Course Section ── */}
            <Text style={styles.filterLabel}>Course Section</Text>

            {/* Collapsed: show selected value as a tappable row */}
            {!showCoursePicker ? (
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                  setShowCoursePicker(true);
                }}
              >
                <Text style={[styles.inputText, !selectedCourseSection && styles.placeholder]}>
                  {selectedCourseSection
                    ? `${selectedCourseSection.course_code} ${selectedCourseSection.course_name}`
                    : 'All courses'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B5BC7" />
              </TouchableOpacity>
            ) : (
              /* Expanded: inline list of options */
              <View style={styles.inlinePicker}>
                <View style={styles.inlinePickerHeader}>
                  <Text style={styles.inlinePickerTitle}>Select Course</Text>
                  <TouchableOpacity onPress={() => setShowCoursePicker(false)}>
                    <Text style={styles.actionText}>Done</Text>
                  </TouchableOpacity>
                </View>
                {courseOptions.map((section, idx) => {
                  const isSelected =
                    section === null
                      ? selectedCourseSection === null
                      : selectedCourseSection?.course_section_id === section.course_section_id;
                  return (
                    <TouchableOpacity
                      key={section ? section.course_section_id : 'all'}
                      style={[
                        styles.courseOption,
                        idx < courseOptions.length - 1 && styles.courseOptionBorder,
                        isSelected && styles.courseOptionSelected,
                      ]}
                      onPress={() => {
                        onSelectCourse(section);
                        setShowCoursePicker(false);
                      }}
                    >
                      <Text style={[styles.courseOptionText, isSelected && styles.courseOptionTextSelected]}>
                        {section
                          ? `${section.course_code} ${section.course_name}`
                          : 'All courses'}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#6B5BC7" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Date Range ── */}
            <Text style={styles.filterLabel}>Date Range</Text>

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setShowCoursePicker(false);
                setShowEndPicker(false);
                setShowStartPicker(v => !v);
              }}
            >
              <Text style={[styles.inputText, !startDate && styles.placeholder]}>
                {startDate ? `From: ${formatDate(startDate)}` : 'Start date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
            </TouchableOpacity>

            {Platform.OS === 'ios' && showStartPicker && (
              <View style={styles.inlinePicker}>
                <View style={styles.inlinePickerHeader}>
                  <Text style={styles.inlinePickerTitle}>Start Date</Text>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.actionText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => { if (date) onSelectStartDate(date); }}
                  maximumDate={new Date()}
                  textColor="#000"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.input, { marginTop: 10 }]}
              onPress={() => {
                setShowCoursePicker(false);
                setShowStartPicker(false);
                setShowEndPicker(v => !v);
              }}
            >
              <Text style={[styles.inputText, !endDate && styles.placeholder]}>
                {endDate ? `To: ${formatDate(endDate)}` : 'End date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
            </TouchableOpacity>

            {Platform.OS === 'ios' && showEndPicker && (
              <View style={styles.inlinePicker}>
                <View style={styles.inlinePickerHeader}>
                  <Text style={styles.inlinePickerTitle}>End Date</Text>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.actionText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => { if (date) onSelectEndDate(date); }}
                  maximumDate={new Date()}
                  textColor="#000"
                />
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={handleClose}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Android date pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => { setShowStartPicker(false); if (date) onSelectStartDate(date); }}
          maximumDate={new Date()}
        />
      )}
      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => { setShowEndPicker(false); if (date) onSelectEndDate(date); }}
          maximumDate={new Date()}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  actionText: {
    fontSize: 16,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 8,
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
  inlinePicker: {
    marginTop: 8,
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    overflow: 'hidden',
  },
  inlinePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5F5',
  },
  inlinePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  courseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  courseOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5F5',
  },
  courseOptionSelected: {
    backgroundColor: '#EDE9F8',
  },
  courseOptionText: {
    fontSize: 15,
    color: '#000',
    flex: 1,
  },
  courseOptionTextSelected: {
    color: '#6B5BC7',
    fontWeight: '600',
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