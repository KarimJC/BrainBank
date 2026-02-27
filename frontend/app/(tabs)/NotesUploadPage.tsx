import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface NotesUploadPageProps {
  onClose: () => void;
}

export default function NotesUploadPage({ onClose }: NotesUploadPageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Notes</Text>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});
