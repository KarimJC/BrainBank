import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ 
  visible, 
  onClose, 
  onAction 
}) => {
  const actions = [
    { id: 'add-class', label: 'Add class' },
    { id: 'upload-notes', label: 'Upload notes' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.actionMenu}>
          {actions.map((action) => (
            <TouchableOpacity 
              key={action.id}
              style={styles.actionButton}
              onPress={() => onAction(action.id)}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingBottom: 120,
  },
  actionButton: {
    backgroundColor: '#E8E3F8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#6B4CE6',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ActionMenu;