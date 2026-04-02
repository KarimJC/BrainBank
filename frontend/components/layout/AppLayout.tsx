import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import Header from '../ui/Header';
import BottomNav from '../ui/BottomNav';
import ActionMenu from '../ui/ActionMenu';
import NotesUploadPage from '../../app/(tabs)/NotesUploadPage';
import AddClassModal from '@/app/(tabs)/AddClassPage';

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  profileImage?: any;
  onNavigate?: (route: string) => void;
  activeRoute?: string;
  onClassAdded?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  userName = "User",
  profileImage,
  onNavigate,
  activeRoute = 'home',
  onClassAdded,
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showNotesUpload, setShowNotesUpload] = useState(false);
  const [showAddClassPage, setshowAddClassPage] = useState(false);
 
  const handleAction = (action: string) => {
    setShowActionMenu(false);
    switch (action) {
      case 'upload-notes':
        setShowNotesUpload(true);
        break;
      case 'add-class':
        //if (onNavigate) onNavigate('add-class');
        setshowAddClassPage(true);
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

  const handleCloseAddClassPage = () => {
    setshowAddClassPage(false);
  };

  return (
    <View style={styles.container}>
      <Header userName={userName} profileImage={profileImage} />
      <View style={styles.content}>
        {children}
      </View>
      <Modal
        visible={showAddClassPage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAddClassPage}
      >
        <View style={styles.modalContainer}>
          <AddClassModal onClose={handleCloseAddClassPage} onClassAdded={onClassAdded} />
        </View>
      </Modal>

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