// A error view that will auto-dismiss after a few seconds, also has retry button 

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
  autoDismissMs?: number;
}

const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry, autoDismissMs = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRetry();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <View style={styles.errorContainer}>
      <Ionicons name="cloud-offline-outline" size={48} color="#CC0000" />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  errorText: { color: '#CC0000', fontSize: 16, textAlign: 'center' },
  retryButton: { backgroundColor: '#6B5BC7', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

export default ErrorView;