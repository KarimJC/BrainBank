import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchCourseSections, uploadNote, CourseSection } from '@/app/services/notesService';

interface NotesUploadPageProps {
  onClose?: () => void;
}

export default function NotesUploadPage({ onClose }: NotesUploadPageProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [selectedCourseSection, setSelectedCourseSection] = useState<CourseSection | null>(null);
  const [showCourseSectionPicker, setShowCourseSectionPicker] = useState<boolean>(false);
  const [loadingCourseSections, setLoadingCourseSections] = useState<boolean>(true);

  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPickingFile, setIsPickingFile] = useState<boolean>(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    loadCourseSections();
  }, []);

  const loadCourseSections = async () => {
    try {
      setLoadingCourseSections(true);
      const data = await fetchCourseSections();
      setCourseSections(data);
    } catch (error) {
      console.error('Failed to load course sections:', error);
      Alert.alert('Error', 'Failed to load course sections. Please try again.');
    } finally {
      setLoadingCourseSections(false);
    }
  };

  const formatCourseSection = (section: CourseSection): string => {
    const professorPart = section.professor_name ? ` - Prof. ${section.professor_name}` : '';
    return `${section.course_code} ${section.course_title}${professorPart}`;
  };

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

  const handleDateDone = () => {
    setShowDatePicker(false);
  };

  const takePicture = async (): Promise<void> => {
    try {
      if (!cameraPermission?.granted) {
        const { granted } = await requestCameraPermission();
        if (!granted) {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled) {
        setSelectedMedia(result.assets[0]);
        setSelectedFile(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
      console.error(error);
    }
  };

  const pickImage = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is required.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled) {
        setSelectedMedia(result.assets[0]);
        setSelectedFile(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const pickFile = async (): Promise<void> => {
    if (isPickingFile) return;
    try {
      setIsPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        setSelectedMedia(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
      console.error(error);
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return;
    }
    if (!selectedCourseSection) {
      Alert.alert('Validation Error', 'Please select a course section');
      return;
    }
    if (!selectedMedia && !selectedFile) {
      Alert.alert('Validation Error', 'Please attach at least one file or image');
      return;
    }

    setIsUploading(true);
    try {
      await uploadNote({
        title,
        description,
        date: formatDate(date),
        courseSectionId: selectedCourseSection.course_section_id,
        media: selectedMedia,
        file: selectedFile,
      });

      console.log('Note uploaded successfully!');
      Alert.alert('Success', 'Note uploaded successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            if (onClose) onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload note.';
      if (error instanceof Error) {
        errorMessage = error.message.includes('Network request failed')
          ? 'Network request failed. Please check your connection.'
          : error.message;
      }
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (): void => {
    setSelectedMedia(null);
    setSelectedFile(null);
  };

  const resetForm = (): void => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setSelectedCourseSection(null);
    setSelectedMedia(null);
    setSelectedFile(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Upload Notes</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => { if (onClose) onClose(); }}
              disabled={isUploading}
            >
              <Ionicons name="close" size={32} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter note title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
              editable={!isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
              editable={!isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              disabled={isUploading}
            >
              <Text style={styles.dateText}>{formatDate(date)}</Text>
              <Ionicons name="calendar-outline" size={24} color="#6B5BC7" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Section *</Text>
            <TouchableOpacity
              style={styles.courseInput}
              onPress={() => setShowCourseSectionPicker(true)}
              disabled={isUploading || loadingCourseSections}
            >
              <Text style={[styles.courseText, !selectedCourseSection && styles.placeholder]}>
                {loadingCourseSections
                  ? 'Loading courses...'
                  : selectedCourseSection
                  ? formatCourseSection(selectedCourseSection)
                  : 'Select a course section'}
              </Text>
              <Ionicons name="chevron-down" size={24} color="#6B5BC7" />
            </TouchableOpacity>
          </View>

          <View style={styles.mediaSection}>
            <Text style={styles.label}>Attachments *</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={takePicture}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={28} color="#6B5BC7" />
                <Text style={styles.mediaButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={pickImage}
                disabled={isUploading}
              >
                <Ionicons name="images" size={28} color="#6B5BC7" />
                <Text style={styles.mediaButtonText}>Upload Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={pickFile}
                disabled={isUploading || isPickingFile}
              >
                <Ionicons name="document" size={28} color="#6B5BC7" />
                <Text style={styles.mediaButtonText}>Upload File</Text>
              </TouchableOpacity>
            </View>

            {selectedMedia && (
              <View style={styles.preview}>
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeMedia}
                  disabled={isUploading}
                >
                  <Ionicons name="close-circle" size={28} color="#6B5BC7" />
                </TouchableOpacity>
              </View>
            )}

            {selectedFile && (
              <View style={styles.filePreview}>
                <Ionicons name="document-attach" size={36} color="#6B5BC7" />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? (selectedFile.size / 1024).toFixed(2) : '0'} KB
                  </Text>
                </View>
                <TouchableOpacity onPress={removeMedia} disabled={isUploading}>
                  <Ionicons name="close-circle" size={28} color="#6B5BC7" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCourseSectionPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCourseSectionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCourseSectionPicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setShowCourseSectionPicker(false)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {courseSections.map((section) => (
                <TouchableOpacity
                  key={section.course_section_id}
                  style={[
                    styles.pickerOption,
                    selectedCourseSection?.course_section_id === section.course_section_id &&
                      styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCourseSection(section);
                    setShowCourseSectionPicker(false);
                  }}
                >
                  <View style={styles.pickerOptionContent}>
                    <Text style={styles.courseCodeText}>{section.course_code}</Text>
                    <Text style={styles.courseTitleText}>{section.course_title}</Text>
                    {section.professor_name && (
                      <Text style={styles.professorText}>Prof. {section.professor_name}</Text>
                    )}
                  </View>
                  {selectedCourseSection?.course_section_id === section.course_section_id && (
                    <Ionicons name="checkmark" size={24} color="#6B5BC7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleDateDone}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    color: '#000',
  },
  dateInput: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  courseInput: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseText: {
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
  },
  mediaSection: {
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#E8E5F5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  mediaButtonText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B5BC7',
    fontWeight: '600',
    textAlign: 'center',
  },
  preview: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E8E5F5',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 2,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E5F5',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9B8BD7',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5F5',
  },
  pickerTitle: {
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
  pickerScroll: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FA',
  },
  pickerOptionSelected: {
    backgroundColor: '#F5F3FA',
  },
  pickerOptionContent: {
    flex: 1,
  },
  courseCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5BC7',
    marginBottom: 4,
  },
  courseTitleText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  professorText: {
    fontSize: 12,
    color: '#666',
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
});