import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { api } from "@/services/api";

interface CourseResult {
  course_section_id: number;
  course_code: string;
  course_name: string;
  professor_name: string | null;
  course_crn: number;
}

export default function AddClassModal({ onClose, onClassAdded }: { onClose?: () => void; onClassAdded?: () => void }) {
  const [crn, setCrn] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState<CourseResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleEnroll = async () => {
    if (!result) return;
    setEnrolling(true);
    try {
      const user = await api.getCurrentUser();
      await api.enrollInCourseSection(result.course_section_id, user.user_id);
      if (onClassAdded) onClassAdded();
      if (onClose) onClose();
    } catch (e: any) {
      if (e.message?.includes('Already enrolled')) {
        Alert.alert('Already Enrolled', 'You are already enrolled in this class.');
      } else {
        console.error('Enroll failed:', e);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleSearch = async () => {
    if (!crn) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const data = await api.getCourseSectionByCRN(Number(crn));
      if (data) {
        setResult(data);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Class</Text>
      <Text style={styles.subtitle}>Enter a CRN to search for a course</Text>

      <TextInput
        style={styles.input}
        value={crn}
        onChangeText={(text) => { setCrn(text); setResult(null); setNotFound(false); }}
        placeholder="Enter CRN"
        placeholderTextColor="#999"
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={loading}>
        <Text style={styles.buttonText}>Search</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color="#6B5BC7" style={{ marginTop: 24 }} />}

      {notFound && (
        <Text style={styles.notFound}>No course found with that CRN.</Text>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultCode}>{result.course_code}</Text>
          <Text style={styles.resultName}>{result.course_name}</Text>
          {result.professor_name && (
            <Text style={styles.resultProf}>with {result.professor_name}</Text>
          )}
          <TouchableOpacity style={styles.addButton} onPress={handleEnroll} disabled={enrolling}>
            <Text style={styles.buttonText}>{enrolling ? 'Adding...' : 'Add Class'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#F5F3FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#6B5BC7',
    fontSize: 16,
    fontWeight: '500',
  },
  notFound: {
    color: '#CC0000',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
  },
  resultCard: {
    backgroundColor: '#E8E5F5',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    gap: 4,
  },
  resultCode: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  resultName: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
  },
  resultProf: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#6B5BC7',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
});
