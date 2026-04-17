import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

const COLORS = {
  darkPurple: '#6B4CE6',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiatingChat, setInitiatingChat] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = await api.getCurrentUser();
      setCurrentUserId(currentUser.user_id);

      // Get the profile user's data
      const profileUser = await api.getUserById(Number(userId));
      setUser(profileUser);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUserId || !userId) return;

    setInitiatingChat(true);
    try {
      const conversation = await api.createConversation(currentUserId, Number(userId));
      router.replace(`/conversation/${conversation.conversation_id}` as any);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        // Fetch existing conversation
        const convos = await api.getConversations(currentUserId);
        const existing = convos.find((c: any) =>
          (c.initiator_id === currentUserId && c.recipient_id === Number(userId)) ||
          (c.initiator_id === Number(userId) && c.recipient_id === currentUserId)
        );
        if (existing) {
          router.replace(`/(tabs)/${existing.conversation_id}` as any);
        } else {
          Alert.alert('Error', 'Conversation exists but could not be found');
        }
      } else {
        Alert.alert('Error', 'Failed to start conversation');
      }
    } finally {
      setInitiatingChat(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.darkPurple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const isOwnProfile = currentUserId === Number(userId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Profile Content */}
      <View style={styles.content}>
        {/* Avatar */}
        {user.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>

        {/* Email */}
        <Text style={styles.email}>{user.neu_email}</Text>

        {/* Message Button */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.messageButton, initiatingChat && styles.messageButtonDisabled]}
            onPress={handleMessage}
            disabled={initiatingChat}
          >
            {initiatingChat ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color={COLORS.white} />
                <Text style={styles.messageButtonText}>Message</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isOwnProfile && (
          <Text style={styles.ownProfileText}>This is your profile</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.darkPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarInitials: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: COLORS.mediumGrey,
    marginBottom: 32,
  },
  messageButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  ownProfileText: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.mediumGrey,
  },
  backButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});