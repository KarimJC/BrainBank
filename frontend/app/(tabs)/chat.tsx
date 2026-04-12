import AppLayout from '@/components/layout/AppLayout';
import React, { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/services/api';
import ErrorView from '@/components/ui/ErrorView';

// Conversation Row Component
interface ConversationRowProps {
  messageData: {
    conversation_id: number;
    initiator_id: number;
    recipient_id: number;
    status: string;
    blocked_by: number | null;
    initiator_name: string;
    profile_picture: string | null;
  };
  onPress: () => void;
}

const ConversationRow: React.FC<ConversationRowProps> = ({ messageData, onPress }) => {
  const initials = messageData.initiator_name
    .trim()
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowContent}>
        {/* LEFT SIDE */}
        <View style={styles.leftSection}>
          {messageData.profile_picture ? (
            <Image
              source={{ uri: messageData.profile_picture }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.initiatorName}>{messageData.initiator_name}</Text>
        </View>

        {/* RIGHT SIDE */}
        {messageData.blocked_by !== null && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedText}>Blocked</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

    const pendingCount = conversations.filter(c => 
    c.status === 'pending' && c.recipient_id === currentUserId
  ).length;

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const user = await api.getCurrentUser();
      setCurrentUserId(user.user_id);
      const data = await api.getConversations(user.user_id);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Could not load messages. Check your connection and try again.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleNavigation = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };


  if (initialLoad) {
    return (
      <AppLayout onNavigate={handleNavigation} activeRoute="chat">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6B4CE6" />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout onNavigate={handleNavigation} activeRoute="chat">
        <ErrorView message={error} onRetry={loadConversations} />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      onNavigate={handleNavigation}
      activeRoute="chat"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageHeader}>Messages</Text>
        <View style={styles.toggleContainer}>
          {/* Chats Tab */}
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'chats' && styles.activeToggle]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.toggleText, activeTab === 'chats' && styles.activeText]}>
              Chats
            </Text>
          </TouchableOpacity>

          {/* Requests Tab */}
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'requests' && styles.activeToggle]}
            onPress={() => setActiveTab('requests')}
          >
            <View style={styles.requestsWrapper}>
              <Text style={[styles.toggleText, activeTab === 'requests' && styles.activeText]}>
                Requests
              </Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {activeTab === 'chats'
          ? conversations
              .filter(c => c.status === 'accepted')
              .map(c => (
                <ConversationRow
                  key={c.conversation_id}
                  messageData={{
                    ...c,
                    initiator_name: c.initiator_id === currentUserId
                      ? c.recipient_name
                      : c.initiator_name,
                    profile_picture: c.initiator_id === currentUserId
                      ? c.recipient_profile_picture
                      : c.initiator_profile_picture,
                  }}
                  onPress={() => router.push(`/(tabs)/${c.conversation_id}` as any)}
                />
              ))
          : conversations
              .filter(c => c.status === 'pending' && c.recipient_id === currentUserId)
              .map(c => (
                <ConversationRow
                  key={c.conversation_id}
                  messageData={{
                    ...c,
                    initiator_name: c.initiator_name,
                    profile_picture: c.initiator_profile_picture,
                  }}
                  onPress={() => router.push(`/(tabs)/${c.conversation_id}` as any)}
                />
              ))
        }
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToggle: {
    backgroundColor: '#6B4CE6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeText: {
    color: '#FFFFFF',
  },
  requestsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  initiatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  blockedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B4CE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#6B4CE6',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
