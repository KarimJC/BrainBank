import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ClassmatesModalProps {
  visible: boolean;
  classmates: any[];
  currentUserId: number | null;
  onClose: () => void;
}

export default function ClassmatesModal({ visible, classmates, currentUserId, onClose }: ClassmatesModalProps) {
  const router = useRouter();
  const initiatingChat: number | null = null;

  const handleMessage = async (recipientId: number) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Loading user data...');
      return;
    }

    if (recipientId === currentUserId) {
      Alert.alert('Info', 'This is you!');
      return;
    }
    onClose();
    router.push(`/(tabs)/user/${recipientId}` as any);
  };

  const renderItem = ({ item }: { item: any }) => {
    const initials = `${item.first_name[0]}${item.last_name[0]}`.toUpperCase();
    const isCurrentUser = currentUserId !== null && item.user_id === currentUserId;

    return (
      <View style={styles.item}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>
            {item.first_name} {item.last_name}
            {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
          </Text>
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleMessage(item.user_id)}
            disabled={initiatingChat === item.user_id || !currentUserId}
          >
            {initiatingChat === item.user_id ? (
              <ActivityIndicator size="small" color="#6B4CE6" />
            ) : (
              <Ionicons name="mail-outline" size={20} color="#6B4CE6" />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Classmates</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        
        {classmates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#E8E5F5" />
            <Text style={styles.emptyText}>No classmates yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to enroll in this course!
            </Text>
          </View>
        ) : (
          <FlatList
            data={classmates}
            keyExtractor={(item) => String(item.user_id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#000' 
  },
  list: { 
    padding: 16 
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24 
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6B4CE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16 
  },
  info: { 
    flex: 1, 
    marginLeft: 12 
  },
  name: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000' 
  },
  youLabel: { 
    color: '#999', 
    fontWeight: '400' 
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});