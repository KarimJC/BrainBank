/**
 * BrainBotModal — preserved for future use.
 * This was previously the "Chat with AI" section in chat.tsx.
 * To re-enable, import and render this component inside any screen
 * or present it as a bottom sheet / modal overlay.
 *
 * Usage example:
 *   <BrainBotModal visible={showBrainBot} onClose={() => setShowBrainBot(false)} />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MOCK_COURSES = [
  { key: 'cs2510', sectionId: '7', code: 'CS 2510', description: 'Fundamentals of Computer Science 2' },
  { key: 'math1201', sectionId: '7', code: 'MATH 1201', description: 'Calculus and Differential Equations' },
];

interface BrainBotModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BrainBotModal({ visible, onClose }: BrainBotModalProps) {
  const router = useRouter();

  const openChat = (courseId: string, courseCode: string) => {
    onClose();
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { sectionId: courseId, courseName: courseCode },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>BrainBot</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color="#636366" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subheading}>
            Pick a course to chat with the AI or generate documents from your notes.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {MOCK_COURSES.map((course) => (
              <View key={course.key} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.courseCode}>{course.code}</Text>
                  <Text style={styles.courseDesc}>{course.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => openChat(course.sectionId, course.code)}
                >
                  <IconSymbol name="message" size={18} color="#FFFFFF" />
                  <Text style={styles.chatButtonText}>Chat with AI</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subheading: {
    fontSize: 15,
    color: '#636366',
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#E8E5F5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardInfo: {
    marginBottom: 16,
  },
  courseCode: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  courseDesc: {
    fontSize: 14,
    color: '#636366',
    lineHeight: 19,
  },
  chatButton: {
    backgroundColor: '#6B4CE6',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
