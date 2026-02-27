import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/services/api';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    loadConversation();
  }, [id]);
  
  useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const msgs = await api.getMessages(Number(id));
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  }, 3000); // every 3 seconds

  return () => clearInterval(interval); // cleanup on unmount
}, [id]);

  const loadConversation = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUserId(user.user_id);
      const conv = await api.getConversation(Number(id));
      setConversation(conv);
      const msgs = await api.getMessages(Number(id));
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    try {
      const newMessage = await api.sendMessage(Number(id), inputText.trim());
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAccept = async () => {
    try {
      const updated = await api.updateConversation(conversation.conversation_id, 'accepted');
      setConversation(updated);
    } catch (error) {
      console.error('Failed to accept:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await api.updateConversation(conversation.conversation_id, 'declined');
      router.replace('/(tabs)/chat');
    } catch (error) {
      console.error('Failed to decline:', error);
    }
  };

  if (loading || !conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherPersonName = conversation.initiator_id === currentUserId
    ? conversation.recipient_name
    : conversation.initiator_name;

  const initials = otherPersonName
    .trim()
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/chat')}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.avatarFallbackLarge}>
              <Text style={styles.avatarInitialsLarge}>{initials}</Text>
            </View>
            <Text style={styles.nameLarge}>{otherPersonName}</Text>
          </View>
        </View>

        {/* MESSAGE LIST */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(message => {
            const isMyMessage = message.sender_id === currentUserId;
            return (
              <View
                key={message.message_id}
                style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}
              >
                <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMyMessage && { color: '#FFFFFF' }]}>
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* INPUT BAR */}
        {conversation.status === 'pending' ? (
          <View style={styles.requestActionsBottom}>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : conversation.blocked_by !== null ? (
          <View style={styles.blockedInputBar}>
            <Text style={styles.blockedInputText}>You can't reply to this conversation</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '600',
    color: '#6B4CE6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  avatarFallbackLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B4CE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarInitialsLarge: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  nameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#6B4CE6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6B4CE6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blockedInputBar: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  blockedInputText: {
    color: '#6B7280',
    fontSize: 14,
  },
  requestActionsBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 70,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  acceptButton: {
    backgroundColor: '#6B4CE6',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineText: {
    color: '#111827',
    fontWeight: '600',
  },
});