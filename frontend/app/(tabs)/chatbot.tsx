import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ChatMessage,
  DocumentType,
  GeneratedDocument,
  DOC_LABEL,
  sendChatMessage,
  loadChatHistory,
  generateDocument,
  shareAsPdf,
  openPdfInBrowser,
} from '@/services/chatService';

const COLORS = {
  darkPurple: '#6B4CE6',
  lightPurple: '#E8E5F5',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
  bubbleGrey: '#E9E9EB',
  error: '#FF3B30',
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm BrainBot. I've read all your course notes and I'm ready to help.\n\nYou can ask me anything about the course, or tap a button above to generate a Study Guide, Practice Exam, or Summary — I'll create it as a PDF you can save!",
};

const DOC_BUTTONS: { type: DocumentType; label: string }[] = [
  { type: 'study-guide', label: 'Study Guide' },
  { type: 'practice-exam', label: 'Practice Exam' },
  { type: 'summary', label: 'Summary' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <View style={[styles.bubbleWrapper, styles.bubbleWrapperBot]}>
    <View style={[styles.bubble, styles.bubbleBot]}>
      <View style={styles.typingDots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  </View>
);

interface MessageBubbleProps {
  msg: ChatMessage;
  courseName: string;
  onSharePdf: (msg: ChatMessage) => void;
  onViewPdf: (msg: ChatMessage) => void;
  sharingId: string | null;
  viewingId: string | null;
}

const MessageBubble = ({ msg, courseName, onSharePdf, onViewPdf, sharingId, viewingId }: MessageBubbleProps) => (
  <View
    style={[
      styles.bubbleWrapper,
      msg.role === 'user' ? styles.bubbleWrapperUser : styles.bubbleWrapperBot,
    ]}
  >
    <View style={styles.bubbleColumn}>
      <View
        style={[
          styles.bubble,
          msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
          msg.isDocument && styles.bubbleDocument,
        ]}
      >
        {msg.isDocument && msg.docType && (
          <View style={styles.docBadge}>
            <Text style={styles.docBadgeText}>
              📄 {DOC_LABEL[msg.docType as DocumentType]}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.bubbleText,
            msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
          ]}
        >
          {msg.content}
        </Text>
      </View>
      {msg.isDocument && (
        <View style={styles.docButtonRow}>
          <TouchableOpacity
            style={[styles.pdfButton, styles.pdfButtonView, viewingId === msg.id && styles.pdfButtonLoading]}
            onPress={() => onViewPdf(msg)}
            disabled={viewingId === msg.id || sharingId === msg.id}
          >
            {viewingId === msg.id ? (
              <ActivityIndicator size="small" color={COLORS.darkPurple} />
            ) : (
              <Text style={[styles.pdfButtonText, styles.pdfButtonTextView]}>📄 View PDF</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pdfButton, sharingId === msg.id && styles.pdfButtonLoading]}
            onPress={() => onSharePdf(msg)}
            disabled={sharingId === msg.id || viewingId === msg.id}
          >
            {sharingId === msg.id ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.pdfButtonText}>📤 Share</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sectionId: string; courseName: string }>();
  const sectionId = Number(params.sectionId ?? '1');
  const courseName = params.courseName ?? 'Course';

  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  // TODO: replace with real user ID lookup once backend auth is set up
  const [userId, setUserId] = useState<number | null>(5);
  const [userIdError, setUserIdError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [docGenerating, setDocGenerating] = useState<DocumentType | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    setMessages([WELCOME_MESSAGE]);
    setUserIdError(false);
    (async () => {
      try {
        const history = await loadChatHistory(5, sectionId);
        if (history.length > 0) {
          setMessages(history);
        }
      } catch (e) {
        console.warn('Could not load chat history:', e);
        setUserIdError(true);
      }
    })();
  }, [sectionId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading, docGenerating]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !userId) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const aiText = await sendChatMessage(userId, sectionId, userMsg.content);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Sorry, something went wrong. Please check your connection and try again.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (type: DocumentType) => {
    if (!userId || docGenerating) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Generate a ${DOC_LABEL[type]} for this course.`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setDocGenerating(type);

    try {
      const doc: GeneratedDocument = await generateDocument(userId, sectionId, type);
      const docMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Your ${DOC_LABEL[type]} is ready! Tap the button below to open and share the PDF.`,
        isDocument: true,
        docType: type,
        docId: doc.docId,
      };
      setMessages((prev) => [...prev, docMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Could not generate the ${DOC_LABEL[type]}. Make sure there are uploaded notes for this course and the backend is running.`,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setDocGenerating(null);
    }
  };

  const handleViewPdf = async (msg: ChatMessage) => {
    if (!msg.docId) return;
    setViewingId(msg.id);
    try {
      await openPdfInBrowser(msg.docId);
    } catch (e) {
      Alert.alert('View Error', 'Could not open the PDF. Please try again.');
    } finally {
      setViewingId(null);
    }
  };

  const handleSharePdf = async (msg: ChatMessage) => {
    if (!msg.docType || !msg.docId) return;
    setSharingId(msg.id);
    try {
      await shareAsPdf(msg.docId, msg.docType as DocumentType, courseName);
    } catch (e) {
      Alert.alert('PDF Error', 'Could not fetch the PDF from the server. Please try again.');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            name="chevron.right"
            size={28}
            color={COLORS.black}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={require('@/assets/images/BrainBot.png')}
            style={styles.avatarImage}
            resizeMode="contain"
          />
          <View>
          <Text style={styles.headerTitle}>
            Brain<Text style={{ color: COLORS.darkPurple }}>Bot</Text>
          </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {courseName}
            </Text>
          </View>
        </View>
        <View style={{ width: 48 }} />
      </View>

      {/* Quick-action document buttons */}
      <View style={styles.quickActions}>
        {DOC_BUTTONS.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.quickButton,
              docGenerating === type && styles.quickButtonActive,
              (!!docGenerating && docGenerating !== type) && styles.quickButtonDisabled,
            ]}
            onPress={() => handleGenerate(type)}
            disabled={!!docGenerating || !userId}
          >
            {docGenerating === type ? (
              <ActivityIndicator size="small" color={COLORS.darkPurple} />
            ) : (
              <Text style={styles.quickButtonText}>{label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {userIdError && (
        <View style={styles.warningBar}>
          <Text style={styles.warningText}>
            ⚠️ Could not reach the backend. Chat history unavailable.
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            courseName={courseName}
            onSharePdf={handleSharePdf}
            onViewPdf={handleViewPdf}
            sharingId={sharingId}
            viewingId={viewingId}
          />
        ))}
        {(isLoading || docGenerating) && <TypingIndicator />}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask BrainBot anything..."
          placeholderTextColor={COLORS.mediumGrey}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || isLoading || !userId) && styles.sendButtonDisabled,
          ]}
          disabled={!input.trim() || isLoading || !userId}
          onPress={handleSend}
        >
          <IconSymbol name="paperplane.fill" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.mediumGrey,
    maxWidth: 180,
    marginTop: 2,
  },
  avatarImage: {
    width: 56,
    height: 56,
    marginBottom: 5,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
    backgroundColor: COLORS.white,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  quickButtonActive: {
    backgroundColor: COLORS.lightPurple,
  },
  quickButtonDisabled: {
    opacity: 0.4,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  warningBar: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  bubbleWrapperUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperBot: {
    justifyContent: 'flex-start',
  },
  bubbleColumn: {
    maxWidth: '75%',
    gap: 6,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.darkPurple,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: COLORS.bubbleGrey,
    borderBottomLeftRadius: 4,
  },
  bubbleDocument: {
    borderWidth: 1.5,
    borderColor: COLORS.darkPurple,
    backgroundColor: COLORS.white,
  },
  docBadge: {
    backgroundColor: COLORS.lightPurple,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: COLORS.white,
  },
  bubbleTextBot: {
    color: COLORS.black,
  },
  docButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: COLORS.darkPurple,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  pdfButtonView: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.darkPurple,
  },
  pdfButtonLoading: {
    opacity: 0.7,
  },
  pdfButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  pdfButtonTextView: {
    color: COLORS.darkPurple,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGrey,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGrey,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.black,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.darkPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.mediumGrey,
    opacity: 0.6,
  },
});