import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseSection } from '@/app/services/notesService';

interface CourseSectionPickerProps {
  visible: boolean;
  sections: CourseSection[];
  selected: CourseSection | null;
  onSelect: (section: CourseSection | null) => void;
  onClose: () => void;
  showAllOption?: boolean;
}

export default function CourseSectionPicker({
  visible,
  sections,
  selected,
  onSelect,
  onClose,
  showAllOption = false,
}: CourseSectionPickerProps) {
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
            <Text style={styles.title}>Select Course</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            {showAllOption && (
              <TouchableOpacity
                style={[styles.option, !selected && styles.optionSelected]}
                onPress={() => { onSelect(null); onClose(); }}
              >
                <Text style={styles.optionTitle}>All courses</Text>
                {!selected && <Ionicons name="checkmark" size={24} color="#6B5BC7" />}
              </TouchableOpacity>
            )}

            {sections.map((section) => (
              <TouchableOpacity
                key={section.course_section_id}
                style={[
                  styles.option,
                  selected?.course_section_id === section.course_section_id && styles.optionSelected,
                ]}
                onPress={() => { onSelect(section); onClose(); }}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.courseCode}>{section.course_code}</Text>
                  <Text style={styles.optionTitle}>{section.course_title}</Text>
                  {section.professor_name && (
                    <Text style={styles.professor}>Prof. {section.professor_name}</Text>
                  )}
                </View>
                {selected?.course_section_id === section.course_section_id && (
                  <Ionicons name="checkmark" size={24} color="#6B5BC7" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  optionSelected: {
    backgroundColor: '#F5F3FA',
  },
  optionContent: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5BC7',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  professor: {
    fontSize: 12,
    color: '#666',
  },
});