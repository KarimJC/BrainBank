import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NoteItem, CourseSection, updateNote } from '@/app/services/notesService';
import CourseSectionPicker from './CourseSectionPicker';

interface NoteEditModalProps {
  note: NoteItem | null;
  courseSections: CourseSection[];
  onClose: () => void;
  onUpdated: (updated: NoteItem) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY = 0.3;

export default function NoteEditModal({ note, courseSections, onClose, onUpdated }: NoteEditModalProps) {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedCourseSection, setSelectedCourseSection] = useState<CourseSection | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (note) {
      translateX.setValue(SCREEN_WIDTH);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTitle(note.title);
      setDescription(note.description || '');
      setNotesContent(note.notesContent || '');
      setDate(new Date(note.dateUploaded));
      const section = courseSections.find(s => s.course_section_id === note.courseSectionId) || null;
      setSelectedCourseSection(section);
      setSelectedMedia(null);
      setSelectedFile(null);
    }
  }, [note]);

  const handleDismiss = () => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onCloseRef.current());
  };

  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        dx > 5 && Math.abs(dx) > Math.abs(dy),

      onPanResponderGrant: () => {
        translateX.setValue(0);
      },
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) translateX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY) {
          handleDismissRef.current();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const takePicture = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { Alert.alert('Permission Denied', 'Camera permission is required.'); return; }
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (!result.canceled) { setSelectedMedia(result.assets[0]); setSelectedFile(null); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: s } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (s !== 'granted') { Alert.alert('Permission Denied', 'Photo library permission is required.'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (!result.canceled) { setSelectedMedia(result.assets[0]); setSelectedFile(null); }
  };

  const pickFile = async () => {
    if (isPickingFile) return;
    try {
      setIsPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) { setSelectedFile(result.assets[0]); setSelectedMedia(null); }
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Validation Error', 'Please enter a title'); return; }
    if (!note) return;

    setIsSaving(true);
    try {
      const updated = await updateNote({
        noteId: note.noteId,
        title,
        description,
        notesContent,
        date: formatDate(date),
        courseSectionId: selectedCourseSection?.course_section_id,
        media: selectedMedia,
        file: selectedFile,
      });
      onUpdated(updated);
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      let msg = 'Failed to update note.';
      if (error instanceof Error) msg = error.message;
      Alert.alert('Update Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const currentAttachmentLabel = () => {
    if (selectedMedia) return 'New image selected';
    if (selectedFile) return selectedFile.name;
    if (note?.fileName) return note.fileName;
    if (note?.mediaUrl) return 'Current image';
    return null;
  };

  return (
    <Modal visible={!!note} transparent={true} animationType="none" onRequestClose={handleDismiss}>
      {note && (
        <Animated.View
          style={[
            styles.safeArea,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
            { transform: [{ translateX }] },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleDismiss} disabled={isSaving} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Ionicons name="chevron-back" size={32} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Note</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ height: 8 }} />

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter note title"
                placeholderTextColor="#999"
                editable={!isSaving}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>

            {/* Extracted Content */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Extracted Content</Text>
              <TextInput
                style={[styles.input, styles.contentArea]}
                value={notesContent}
                onChangeText={setNotesContent}
                placeholder="Extracted text will appear here"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
                disabled={isSaving}
              >
                <Text style={styles.inputText}>{formatDate(date)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#6B5BC7" />
              </TouchableOpacity>
            </View>

            {/* Course Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Section</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCoursePicker(true)}
                disabled={isSaving}
              >
                <Text style={[styles.inputText, !selectedCourseSection && styles.placeholder]}>
                  {selectedCourseSection
                    ? `${selectedCourseSection.course_code} ${selectedCourseSection.course_title}`
                    : 'Select a course section'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B5BC7" />
              </TouchableOpacity>
            </View>

            {/* Attachment */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Replace Attachment</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.mediaButton} onPress={takePicture} disabled={isSaving}>
                  <Ionicons name="camera" size={24} color="#6B5BC7" />
                  <Text style={styles.mediaButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={pickImage} disabled={isSaving}>
                  <Ionicons name="images" size={24} color="#6B5BC7" />
                  <Text style={styles.mediaButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={pickFile} disabled={isSaving || isPickingFile}>
                  <Ionicons name="document" size={24} color="#6B5BC7" />
                  <Text style={styles.mediaButtonText}>File</Text>
                </TouchableOpacity>
              </View>

              {selectedMedia && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} resizeMode="contain" />
                  <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedMedia(null)}>
                    <Ionicons name="close-circle" size={28} color="#6B5BC7" />
                  </TouchableOpacity>
                </View>
              )}

              {!selectedMedia && currentAttachmentLabel() && (
                <View style={styles.currentAttachment}>
                  <Ionicons name="document-attach-outline" size={20} color="#6B5BC7" />
                  <Text style={styles.currentAttachmentText} numberOfLines={1}>
                    {currentAttachmentLabel()}
                  </Text>
                  {selectedFile && (
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#6B5BC7" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Invisible left-edge strip that owns the swipe gesture */}
          <View style={styles.swipeZone} {...panResponder.panHandlers} />

          {/* iOS Date Picker */}
          {Platform.OS === 'ios' && showDatePicker && (
            <Modal visible={true} transparent animationType="slide">
              <View style={styles.dateModalOverlay}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    textColor="#000"
                  />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <CourseSectionPicker
            visible={showCoursePicker}
            sections={courseSections}
            selected={selectedCourseSection}
            onSelect={setSelectedCourseSection}
            onClose={() => setShowCoursePicker(false)}
          />
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  swipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5BC7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    color: '#000',
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
  textArea: {
    height: 100,
    paddingTop: 16,
    flexDirection: undefined,
  },
  contentArea: {
    height: 180,
    paddingTop: 16,
    flexDirection: undefined,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#E8E5F5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  mediaButtonText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E8E5F5',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 2,
  },
  currentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    gap: 8,
  },
  currentAttachmentText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
  },
  saveButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9B8BD7',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
});