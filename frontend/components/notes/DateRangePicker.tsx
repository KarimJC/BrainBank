import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  activePicker: 'start' | 'end' | null;
  showStartPicker: boolean;
  showEndPicker: boolean;
  onDateChange: (type: 'start' | 'end', date: Date | undefined) => void;
  onClose: () => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  activePicker,
  showStartPicker,
  showEndPicker,
  onDateChange,
  onClose,
}: DateRangePickerProps) {
  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') onClose();
    if (activePicker) onDateChange(activePicker, selectedDate);
  };

  const currentValue =
    activePicker === 'start'
      ? startDate || new Date()
      : endDate || new Date();

  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={showStartPicker || showEndPicker}
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
              <Text style={styles.title}>Select Date</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={currentValue}
              mode="date"
              display="spinner"
              onChange={handleChange}
              maximumDate={new Date()}
              textColor="#000"
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
    </>
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
    paddingBottom: 34,
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
});