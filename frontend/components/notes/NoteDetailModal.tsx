import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NoteItem, CourseSection } from '@/services/notesService';
import NoteEditModal from './NoteEditModal';

interface NoteDetailModalProps {
  note: NoteItem | null;
  courseSections: CourseSection[];
  onClose: () => void;
  onUpdated: (updated: NoteItem) => void;
  editable?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY = 0.3;

const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function NoteDetailModal({ note, courseSections, onClose, onUpdated, editable = true }: NoteDetailModalProps) {  const insets = useSafeAreaInsets();
  const [showEdit, setShowEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!note) return;
    const url = note.fileUrl || note.mediaUrl;
    if (!url) return;

    try {
      setDownloading(true);
      const filename = note.fileName || url.split('/').pop() || 'download';
      const localUri = FileSystem.documentDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(url, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', 'File saved successfully.');
      }
    } catch {
      Alert.alert('Error', 'Failed to download the file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
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

  return (
    <Modal
      visible={!!note}
      transparent={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      {note && (
        <Animated.View
          style={[
            styles.safeArea,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
            { transform: [{ translateX }] },
          ]}
        >
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <Ionicons name="chevron-back" size={32} color="#000" />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                {(note.fileUrl || note.mediaUrl) && (
                  <TouchableOpacity style={styles.downloadButton} onPress={handleDownload} disabled={downloading}>
                    {downloading ? (
                      <ActivityIndicator size="small" color="#6B5BC7" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={18} color="#6B5BC7" />
                        <Text style={styles.editButtonText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {editable && (
                  <TouchableOpacity style={styles.editButton} onPress={() => setShowEdit(true)}>
                    <Ionicons name="pencil-outline" size={18} color="#6B5BC7" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.courseBadge}>
              <Text style={styles.courseCode}>{note.courseTitle} · {note.courseCode}</Text>
            </View>

            <Text style={styles.title}>{note.title}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color="#999" />
              <Text style={styles.metaText}>{formatDisplayDate(note.dateUploaded)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="book-outline" size={16} color="#999" />
              <Text style={styles.metaText}>{note.courseTitle}</Text>
            </View>

            {note.professorName && (
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={16} color="#999" />
                <Text style={styles.metaText}>Prof. {note.professorName}</Text>
              </View>
            )}

            {note.uploaderName && (
              <View style={styles.metaRow}>
                <Ionicons name="person-circle-outline" size={16} color="#999" />
                <Text style={styles.metaText}>Uploaded by {note.uploaderName}</Text>
              </View>
            )}

            {note.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.sectionText}>{note.description}</Text>
              </View>
            ) : null}

            {note.notesContent ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Extracted Content</Text>
                <ScrollView style={styles.contentScroll} nestedScrollEnabled>
                  <Text style={styles.sectionText}>{note.notesContent}</Text>
                </ScrollView>
              </View>
            ) : null}

            {(note.mediaUrl || note.fileUrl) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Attachment</Text>
                {note.mediaUrl ? (
                  <Image
                    source={{ uri: note.mediaUrl }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : note.fileUrl ? (
                  <TouchableOpacity
                    style={styles.fileRow}
                    onPress={() => Linking.openURL(note.fileUrl!)}
                  >
                    <Ionicons name="document-attach" size={36} color="#6B5BC7" />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileNameText} numberOfLines={2}>
                        {note.fileName || 'View attachment'}
                      </Text>
                      {note.fileSize != null && (
                        <Text style={styles.fileSizeText}>
                          {(note.fileSize / 1024).toFixed(1)} KB
                        </Text>
                      )}
                    </View>
                    <Ionicons name="open-outline" size={20} color="#6B5BC7" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Invisible left-edge strip that owns the swipe gesture */}
          <View style={styles.swipeZone} {...panResponder.panHandlers} />

          <NoteEditModal
            note={showEdit ? note : null}
            courseSections={courseSections}
            onClose={() => setShowEdit(false)}
            onUpdated={(updated) => { onUpdated(updated); setShowEdit(false); }}
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    minWidth: 44,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#6B5BC7',
    fontWeight: '600',
  },
  courseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5BC7',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5BC7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  contentScroll: {
    maxHeight: 300,
    backgroundColor: '#F5F3FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#E8E5F5',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  fileSizeText: {
    fontSize: 13,
    color: '#999',
  },
});