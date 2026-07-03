import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import Header from '../ui/Header';
import BottomNav from '../ui/BottomNav';
import ActionMenu from '../ui/ActionMenu';
import NotesUploadPage from '../../app/(tabs)/NotesUploadPage';
import SearchClassModal from '@/app/(tabs)/SearchClassModal';

interface AppLayoutProps {
  children: React.ReactNode;
  onNavigate?: (route: string) => void;
  activeRoute?: string;
  onClassAdded?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onNavigate,
  activeRoute = 'home',
  onClassAdded,
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showNotesUpload, setShowNotesUpload] = useState(false);
  const [showSearchClassModal, setShowSearchClassModal] = useState(false);
 
  const handleAction = (action: string) => {
    setShowActionMenu(false);
    switch (action) {
      case 'upload-notes':
        setShowNotesUpload(true);
        break;
      case 'add-class':
        setShowSearchClassModal(true);
        break;
      case 'generate-document':
        if (onNavigate) onNavigate('generate-document');
        break;
      default:
        if (onNavigate) onNavigate(action);
    }
  };

  const handleNavigation = (route: string) => {
    if (onNavigate) onNavigate(route);
  };

  const handleCloseNotesUpload = () => {
    setShowNotesUpload(false);
  };

  return (
    <View style={styles.container}>
      <Header onNavigate={handleNavigation} activeRoute={activeRoute} />
      <View style={styles.content}>
        {children}
      </View>

      <SearchClassModal
        visible={showSearchClassModal}
        onClose={() => setShowSearchClassModal(false)}
        onClassAdded={onClassAdded}
      />

      <ActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onAction={handleAction}
      />
      <Modal
        visible={showNotesUpload}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseNotesUpload}
      >
        <View style={styles.modalContainer}>
          <NotesUploadPage onClose={handleCloseNotesUpload} />
        </View>
      </Modal>
      <BottomNav
        onNavigate={handleNavigation}
        onPressAdd={() => setShowActionMenu(true)}
        activeRoute={activeRoute}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default AppLayout;