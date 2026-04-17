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
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, WS_URL} from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import GifPicker from '@/components/ui/GifPicker'; 

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isMounted = useRef(true);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const isGif = (content: string) => content.startsWith('[GIF]:');
  const getGifUrl = (content: string) => content.replace('[GIF]:', '');

  useEffect(() => {
    setLoading(true);
    setConversation(null);
    setMessages([]);
    setNextCursor(null);
    loadConversation();
  }, [id]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/api/v1/ws/${currentUserId}`);

      ws.onopen = () => {
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const incoming = JSON.parse(event.data);
          if (incoming.conversation_id === Number(id)) {
            setMessages(prev => [...prev, incoming]);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!isMounted.current) return;
        // Reconnect up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s)
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 16000);
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [currentUserId]);

  const loadConversation = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUserId(user.user_id);
      const conv = await api.getConversation(Number(id));
      setConversation(conv);
      const result = await api.getMessages(Number(id));
      setMessages(result.messages);
      setNextCursor(result.next_cursor);
      // Mark as read — fire and forget, don't block the UI
      api.markConversationRead(Number(id)).catch(() => {});
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await api.getMessages(Number(id), { before: nextCursor });
      setMessages(prev => [...result.messages, ...prev]);
      setNextCursor(result.next_cursor);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendContent = async (text: string) => {
    if (!text) return;

    const optimistic = {
      message_id: Date.now().toString(),
      sender_id: currentUserId,
      content: text,
      conversation_id: Number(id),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ conversation_id: Number(id), content: text }));
    } else {
      try {
        await api.sendMessage(Number(id), text);
      } catch (e) {
        console.error('Failed to send via REST fallback:', e);
        setMessages(prev => prev.filter(m => m.message_id !== optimistic.message_id));
      }
    }
  };

  const handleSelectGif = (gifUrl: string) => {
    setShowGifPicker(false);
    sendContent(`[GIF]:${gifUrl}`);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendContent(text);
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
      router.back();
    } catch (error) {
      console.error('Failed to decline:', error);
    }
  };

  const handleBlock = async () => {
    try {
      const updated = await api.updateConversation(conversation.conversation_id, 'blocked');
      setConversation(updated);
    } catch (error) {
      console.error('Failed to block:', error);
    }
  };

  const handleUnblock = async () => {
    try {
      const updated = await api.updateConversation(conversation.conversation_id, 'accepted');
      setConversation(updated);
    } catch (error) {
      console.error('Failed to unblock:', error);
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

  const otherPersonProfilePicture = conversation.initiator_id === currentUserId
    ? conversation.recipient_profile_picture
    : conversation.initiator_profile_picture;

  const initials = otherPersonName
    .trim()
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isPendingRequest = conversation.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {otherPersonProfilePicture ? (
              <Image
                source={{ uri: otherPersonProfilePicture }}
                style={styles.avatarImageLarge}
              />
            ) : (
              <View style={styles.avatarFallbackLarge}>
                <Text style={styles.avatarInitialsLarge}>{initials}</Text>
              </View>
            )}
            <Text style={styles.nameLarge}>{otherPersonName}</Text>
          </View>
          {conversation.status === 'accepted' && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() =>
                Alert.alert('Options', undefined, [
                  {
                    text: `Block ${otherPersonName}`,
                    style: 'destructive',
                    onPress: handleBlock,
                  },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MESSAGE LIST */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* LOAD OLDER MESSAGES */}
          {nextCursor && (
            <TouchableOpacity style={styles.loadOlderButton} onPress={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder
                ? <ActivityIndicator size="small" color="#6B4CE6" />
                : <Text style={styles.loadOlderText}>Load older messages</Text>
              }
            </TouchableOpacity>
          )}

          {messages.map(message => {
            const isMyMessage = message.sender_id === currentUserId;
            const messageIsGif = isGif(message.content);
            
            return (
              <View
                key={message.message_id}
                style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}
              >
                <View style={[
                  styles.messageBubble, 
                  isMyMessage ? styles.myBubble : styles.theirBubble,
                  messageIsGif && styles.gifBubble
                ]}>
                  {messageIsGif ? (
                    <Image
                      source={{ uri: getGifUrl(message.content) }}
                      style={styles.gifImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.messageText, isMyMessage && { color: '#FFFFFF' }]}>
                      {message.content}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* INPUT BAR */}
        {isPendingRequest ? (
          // Show Accept/decline if you're the recipient 
          <View style={styles.requestActionsBottom}>
            {Number(conversation.recipient_id) === currentUserId && (
              <>
                <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}
            {Number(conversation.recipient_id) === currentUserId ? (
              <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
                <Text style={styles.blockText}>Block</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                <Text style={styles.declineText}>Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : conversation.blocked_by !== null ? (
          conversation.blocked_by === currentUserId ? (
            <View style={styles.blockedInputBar}>
              <Text style={styles.blockedInputText}>You blocked {otherPersonName}</Text>
              <TouchableOpacity style={styles.unblockButton} onPress={handleUnblock}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.blockedInputBar}>
              <Text style={styles.blockedInputText}>You can&apos;t reply to this conversation</Text>
            </View>
          )
        ) : (
          // Show normal input bar for accepted conversations or if you're the initiator waiting for response
          <View style={styles.inputBar}>
            <TouchableOpacity 
              style={styles.gifButton} 
              onPress={() => setShowGifPicker(true)}
            >
              <Ionicons name="happy-outline" size={24} color="#6B4CE6" />
            </TouchableOpacity>
            
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

      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSelectGif}
      />
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
  avatarImageLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
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
  gifBubble: {
    padding: 0,
    overflow: 'hidden',
  },
  gifImage: {
    width: 200,
    height: 200,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
  },
  loadOlderButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  loadOlderText: {
    color: '#6B4CE6',
    fontSize: 13,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  gifButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  blockButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  blockText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  unblockButton: {
    marginTop: 8,
    backgroundColor: '#6B4CE6',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
  },
  unblockText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  menuButton: {
    position: 'absolute',
    right: 16,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 26,
    color: '#6B4CE6',
    fontWeight: '700',
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
