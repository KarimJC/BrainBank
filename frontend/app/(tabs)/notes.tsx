// app/(tabs)/notes.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Image,
  Linking,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { API_ENDPOINTS } from '../config/api';

interface Note {
  noteId: number;
  title: string;
  description: string;
  dateUploaded: string;
  courseSectionId?: number;
  courseCode?: string;
  courseName?: string;
  professorName?: string;
  mediaUrl?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  notesContent?: string;  // Added - OCR extracted text
}

interface CourseSection {
  course_section_id: number;
  course_code: string;
  course_name: string;
  course_title: string;
  professor_name: string | null;
}

interface NoteDetail extends Note {
  notes_content?: string;  // Fallback in case backend uses snake_case
}

const CURRENT_USER_ID = 5;

function NotesListView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalNotes, setTotalNotes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingNoteDetail, setLoadingNoteDetail] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseSection, setSelectedCourseSection] = useState<number | null>(null);
  const [showCourseFilter, setShowCourseFilter] = useState(false);
  const [availableCourseSections, setAvailableCourseSections] = useState<CourseSection[]>([]);
  
  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAvailableCourseSections();
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [searchQuery, selectedCourseSection, startDate, endDate]);

  const fetchAvailableCourseSections = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/api/notes/course-sections`, {
        method: 'GET',
      });

      if (response.ok) {
        const courseSections: CourseSection[] = await response.json();
        setAvailableCourseSections(courseSections);
      }
    } catch (error) {
      console.error('Failed to fetch available course sections:', error);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.NOTES_COUNT}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setTotalNotes(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch total count:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedCourseSection) params.append('courseSectionId', selectedCourseSection.toString());
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
      
      const url = `${API_ENDPOINTS.NOTES}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }

      const allNotes: Note[] = await response.json();
      console.log('Fetched notes:', allNotes.length);
      setNotes(allNotes);
      
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNoteDetail = async (noteId: number) => {
    try {
      setLoadingNoteDetail(true);
      const response = await fetch(`${API_ENDPOINTS.NOTES}/${noteId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch note details: ${response.status}`);
      }

      const noteDetail: NoteDetail = await response.json();
      console.log('Note detail fetched:', noteDetail);
      setSelectedNote(noteDetail);
      
    } catch (error) {
      console.error('Failed to fetch note detail:', error);
      Alert.alert('Error', 'Failed to load note details.');
    } finally {
      setLoadingNoteDetail(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNotes(), fetchAvailableCourseSections(), fetchTotalCount()]);
    setRefreshing(false);
  };

  const handleNotePress = async (note: Note) => {
    console.log('Note clicked:', note);
    setShowDetailModal(true);
    await fetchNoteDetail(note.noteId);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCourseSection(null);
    setStartDate(null);
    setEndDate(null);
  };

  const handleCourseSectionSelect = (courseSectionId: number | null) => {
    setSelectedCourseSection(courseSectionId);
    setShowCourseFilter(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleOpenFile = async (url?: string) => {
    if (!url) {
      Alert.alert('Error', 'No file URL available');
      return;
    }
    try {
      console.log('Opening file:', url);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
      }
    } else if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
      if (selectedDate) {
        setEndDate(selectedDate);
      }
    } else if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setStartDate(tempStartDate);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(tempEndDate);
    setShowEndPicker(false);
  };

  const getSelectedCourseSectionName = (): string => {
    if (!selectedCourseSection) return 'Course';
    const section = availableCourseSections.find(cs => cs.course_section_id === selectedCourseSection);
    return section ? section.course_code : 'Course';
  };

  const activeFiltersCount = 
    (searchQuery.trim() ? 1 : 0) + 
    (selectedCourseSection ? 1 : 0) + 
    (startDate ? 1 : 0) + 
    (endDate ? 1 : 0);

  if (isLoading && notes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B5BC7" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes by title or description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons Row */}
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedCourseSection ? styles.filterButtonActive : null]}
            onPress={() => setShowCourseFilter(true)}
          >
            <Ionicons name="book-outline" size={18} color={selectedCourseSection ? '#fff' : '#6B5BC7'} />
            <Text style={[styles.filterButtonText, selectedCourseSection ? styles.filterButtonTextActive : null]}>
              {getSelectedCourseSectionName()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, (startDate || endDate) ? styles.filterButtonActive : null]}
            onPress={() => setShowDateFilter(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={(startDate || endDate) ? '#fff' : '#6B5BC7'} />
            <Text style={[styles.filterButtonText, (startDate || endDate) ? styles.filterButtonTextActive : null]}>
              Date Range
            </Text>
          </TouchableOpacity>

          {activeFiltersCount > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        <Text style={styles.resultsText}>
          Showing {notes.length} of {totalNotes} notes
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6B5BC7"
            colors={['#6B5BC7']}
          />
        }
      >
        <View style={styles.content}>
          {/* Notes List */}
          {notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#E8E5F5" />
              <Text style={styles.emptyTitle}>
                {totalNotes === 0 ? 'No Notes Yet' : 'No Results'}
              </Text>
              <Text style={styles.emptyText}>
                {totalNotes === 0 
                  ? 'Upload your first note to get started!'
                  : 'No notes match your current filters. Try adjusting your search criteria.'
                }
              </Text>
              {activeFiltersCount > 0 && (
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.resetButtonText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note.noteId}
                style={styles.noteCard}
                onPress={() => handleNotePress(note)}
                activeOpacity={0.7}
              >
                <View style={styles.noteIconContainer}>
                  <Ionicons 
                    name={note.mediaUrl ? "image" : "document-text"} 
                    size={24} 
                    color="#6B5BC7" 
                  />
                </View>

                <View style={styles.noteContent}>
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                  
                  <View style={styles.noteMetaRow}>
                    <View style={styles.courseBadge}>
                      <Ionicons name="book" size={12} color="#6B5BC7" />
                      <Text style={styles.courseText}>{note.courseCode || 'Unknown'}</Text>
                    </View>
                    {note.professorName && (
                      <View style={styles.professorBadge}>
                        <Ionicons name="person" size={12} color="#666" />
                        <Text style={styles.professorText}>{note.professorName}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dateText}>
                    {formatDate(note.dateUploaded)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Course Section Filter Modal */}
      <Modal
        visible={showCourseFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCourseFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Course</Text>
              <TouchableOpacity onPress={() => setShowCourseFilter(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleCourseSectionSelect(null)}
              >
                <Text style={[styles.modalOptionText, !selectedCourseSection ? styles.modalOptionTextActive : null]}>
                  All Courses
                </Text>
                {!selectedCourseSection && <Ionicons name="checkmark" size={24} color="#6B5BC7" />}
              </TouchableOpacity>
              
              {availableCourseSections.map((section) => (
                <TouchableOpacity
                  key={section.course_section_id}
                  style={styles.modalOption}
                  onPress={() => handleCourseSectionSelect(section.course_section_id)}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={[styles.modalOptionText, selectedCourseSection === section.course_section_id ? styles.modalOptionTextActive : null]}>
                      {section.course_code}
                    </Text>
                    {section.professor_name && (
                      <Text style={styles.modalOptionSubtext}>Prof. {section.professor_name}</Text>
                    )}
                  </View>
                  {selectedCourseSection === section.course_section_id && (
                    <Ionicons name="checkmark" size={24} color="#6B5BC7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Date Range</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateFilterContent}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => {
                    setTempStartDate(startDate || new Date());
                    setShowStartPicker(true);
                  }}
                >
                  <Text style={styles.datePickerText}>
                    {startDate ? formatDate(startDate.toISOString()) : 'Select start date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
                </TouchableOpacity>
                {startDate && (
                  <TouchableOpacity 
                    style={styles.clearDateButton}
                    onPress={() => setStartDate(null)}
                  >
                    <Text style={styles.clearDateText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>End Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => {
                    setTempEndDate(endDate || new Date());
                    setShowEndPicker(true);
                  }}
                >
                  <Text style={styles.datePickerText}>
                    {endDate ? formatDate(endDate.toISOString()) : 'Select end date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
                </TouchableOpacity>
                {endDate && (
                  <TouchableOpacity 
                    style={styles.clearDateButton}
                    onPress={() => setEndDate(null)}
                  >
                    <Text style={styles.clearDateText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowDateFilter(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Note Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHeaderTitle}>Note Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {loadingNoteDetail ? (
              <View style={styles.detailLoadingContainer}>
                <ActivityIndicator size="large" color="#6B5BC7" />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {selectedNote ? (
                  <View style={styles.detailContent}>
                    {/* Title */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>TITLE</Text>
                      <Text style={styles.detailValue}>{selectedNote.title}</Text>
                    </View>

                    {/* Course Information */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>COURSE</Text>
                      <View style={styles.courseInfoBox}>
                        <Text style={styles.courseCodeLarge}>{selectedNote.courseCode || 'Unknown'}</Text>
                        {selectedNote.courseName && (
                          <Text style={styles.courseNameText}>{selectedNote.courseName}</Text>
                        )}
                        {selectedNote.professorName && (
                          <View style={styles.professorRow}>
                            <Ionicons name="person" size={16} color="#666" />
                            <Text style={styles.professorNameText}>Prof. {selectedNote.professorName}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Date */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>DATE UPLOADED</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedNote.dateUploaded)}</Text>
                    </View>

                    {/* Description */}
                    {selectedNote.description && selectedNote.description.trim() !== '' && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>DESCRIPTION</Text>
                        <Text style={styles.detailValue}>{selectedNote.description}</Text>
                      </View>
                    )}

                    {/* Extracted Notes Content (OCR) */}
                    {(selectedNote.notesContent || selectedNote.notes_content) && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>EXTRACTED TEXT</Text>
                        <View style={styles.notesContentBox}>
                          <Text style={styles.notesContentText}>
                            {selectedNote.notesContent || selectedNote.notes_content}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Attachments */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>ATTACHMENTS</Text>
                      
                      {selectedNote.mediaUrl && (
                        <TouchableOpacity 
                          style={styles.attachmentCard}
                          onPress={() => handleOpenFile(selectedNote.mediaUrl)}
                          activeOpacity={0.8}
                        >
                          <Image 
                            source={{ uri: selectedNote.mediaUrl }} 
                            style={styles.attachmentImage}
                            resizeMode="cover"
                          />
                          <View style={styles.attachmentOverlay}>
                            <Ionicons name="open-outline" size={24} color="#fff" />
                            <Text style={styles.overlayText}>Tap to open</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {selectedNote.fileUrl && (
                        <TouchableOpacity 
                          style={styles.fileAttachment}
                          onPress={() => handleOpenFile(selectedNote.fileUrl)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="document-attach" size={32} color="#6B5BC7" />
                          <View style={styles.fileAttachmentInfo}>
                            <Text style={styles.fileAttachmentName} numberOfLines={2}>
                              {selectedNote.fileName || 'Document'}
                            </Text>
                            <Text style={styles.fileAttachmentSize}>
                              {formatFileSize(selectedNote.fileSize)}
                            </Text>
                          </View>
                          <Ionicons name="download-outline" size={24} color="#6B5BC7" />
                        </TouchableOpacity>
                      )}

                      {!selectedNote.mediaUrl && !selectedNote.fileUrl && (
                        <View style={styles.noAttachmentsBox}>
                          <Ionicons name="attach-outline" size={32} color="#E8E5F5" />
                          <Text style={styles.noAttachments}>No attachments</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailContent}>
                    <Text style={styles.noDataText}>No note data available</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Close Button */}
            <View style={styles.detailFooter}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS Date Pickers */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal
          visible={showStartPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStartPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Start Date</Text>
                <TouchableOpacity onPress={confirmStartDate}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showEndPicker && (
        <Modal
          visible={showEndPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEndPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>End Date</Text>
                <TouchableOpacity onPress={confirmEndDate}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                maximumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={tempStartDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          maximumDate={new Date()}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={tempEndDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

// Main export with AppLayout wrapper
export default function NotesScreen() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === 'home') {
      router.push('/(tabs)');
    } else if (route === 'notes') {
      router.push('/(tabs)/notes');
    } else if (route === 'chat') {
      router.push('/(tabs)/chat');
    } else if (route === 'profile') {
      router.push('/(tabs)/profile');
    }
  };

  return (
    <AppLayout 
      userName="User" 
      onNavigate={handleNavigation}
      activeRoute="notes"
    >
      <NotesListView />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8E5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  filterButtonActive: {
    backgroundColor: '#6B5BC7',
    borderColor: '#6B5BC7',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5BC7',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5BC7',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  resetButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    gap: 12,
  },
  noteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteContent: {
    flex: 1,
    gap: 6,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  noteMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courseText: {
    fontSize: 12,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  professorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  professorText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
  modalOptionTextActive: {
    color: '#6B5BC7',
    fontWeight: '600',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dateFilterContent: {
    padding: 20,
  },
  dateInputGroup: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  datePickerText: {
    fontSize: 16,
    color: '#000',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5F5',
  },
  datePickerTitle: {
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
  detailModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  detailHeaderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  detailScroll: {
    flex: 1,
  },
  detailLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 60,
  },
  detailContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailSection: {
    marginBottom: 28,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 17,
    color: '#000',
    lineHeight: 26,
  },
  courseInfoBox: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  courseCodeLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6B5BC7',
    marginBottom: 6,
  },
  courseNameText: {
    fontSize: 15,
    color: '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  professorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  professorNameText: {
    fontSize: 14,
    color: '#666',
  },
  notesContentBox: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    maxHeight: 300,
  },
  notesContentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 22,
  },
  attachmentCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8E5F5',
    marginBottom: 16,
  },
  attachmentImage: {
    width: '100%',
    height: 220,
  },
  attachmentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(107, 91, 199, 0.95)',
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  fileAttachmentInfo: {
    flex: 1,
  },
  fileAttachmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  fileAttachmentSize: {
    fontSize: 13,
    color: '#666',
  },
  noAttachmentsBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    borderStyle: 'dashed',
  },
  noAttachments: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  detailFooter: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FA',
  },
  closeButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});