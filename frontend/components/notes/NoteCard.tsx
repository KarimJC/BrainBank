import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoteItem } from '@/services/notesService';

interface NoteCardProps {
  note: NoteItem;
  onPress: (note: NoteItem) => void;
}

const formatDisplayDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function NoteCard({ note, onPress }: NoteCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(note)}>
      <View style={styles.header}>
        <View style={styles.courseBadge}>
          <Text style={styles.courseCode}>{note.courseCode}</Text>
        </View>
        <Text style={styles.date}>{formatDisplayDate(note.dateUploaded)}</Text>
      </View>
      <Text style={styles.title}>{note.title}</Text>
      {note.description ? (
        <Text style={styles.description} numberOfLines={2}>{note.description}</Text>
      ) : null}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.courseInfo} numberOfLines={1}>
            {note.courseTitle}{note.professorName ? ` · Prof. ${note.professorName}` : ''}
          </Text>
          {note.uploaderName ? (
            <Text style={styles.uploaderText} numberOfLines={1}>by {note.uploaderName}</Text>
          ) : null}
        </View>
        <View style={styles.attachmentBadge}>
          <Ionicons
            name={note.mediaUrl ? 'image-outline' : 'document-outline'}
            size={12}
            color="#6B5BC7"
          />
          <Text style={styles.attachmentText}>{note.mediaUrl ? 'Image' : 'File'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseBadge: {
    backgroundColor: '#E8E5F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5BC7',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  description: {
    fontSize: 13,
    color: '#444',
    marginBottom: 3,
  },
  content: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  footerLeft: {
    flex: 1,
    marginRight: 8,
  },
  courseInfo: {
    fontSize: 11,
    color: '#999',
  },
   uploaderText: {
    fontSize: 11,
    color: '#6B5BC7',
    marginTop: 2,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8E5F5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  attachmentText: {
    fontSize: 11,
    color: '#6B5BC7',
    fontWeight: '600',
  },
});