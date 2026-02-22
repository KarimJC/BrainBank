import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

const COLORS = {
  darkPurple: "#6B4CE6",
  lightPurple: "#E8E5F5",
  white: "#FFFFFF",
  black: "#1C1C1E",
  mediumGrey: "#636366",
  lightGrey: "#F2F2F7",
  bubbleGrey: "#E9E9EB",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hi! I'm BrainBot 🤖 Ask me anything about your courses, notes, or concepts you're studying!",
  },
  {
    id: "2",
    role: "user",
    content: "Can you explain Big O notation?",
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Big O notation describes how the runtime or space of an algorithm grows relative to its input size.\n\nFor example:\n• O(1) — constant time\n• O(n) — grows linearly\n• O(n²) — grows quadratically\n\nIt helps you compare algorithm efficiency without worrying about hardware specifics.",
  },
];

const TypingIndicator = () => (
  <View
    style={[
      styles.bubbleWrapper,
      styles.bubbleWrapperBot,
    ]}
  >
    <View style={styles.avatarTiny}>
      <Text style={{ fontSize: 12 }}>🤖</Text>
    </View>
    <View style={[styles.bubble, styles.bubbleBot]}>
      <View style={styles.typingDots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  </View>
);

export default function ChatbotScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToEcho = input.trim();
    setInput("");

    setIsLoading(true);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: messageToEcho,
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconSymbol
            name="chevron.right"
            size={24}
            color={COLORS.black}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>BrainBot</Text>
            <Text style={styles.headerSubtitle}>Academic AI Assistant</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubbleWrapper,
              msg.role === "user"
                ? styles.bubbleWrapperUser
                : styles.bubbleWrapperBot,
            ]}
          >
            {msg.role === "assistant" && (
              <View style={styles.avatarTiny}>
                <Text style={{ fontSize: 12 }}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === "user" ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === "user"
                    ? styles.bubbleTextUser
                    : styles.bubbleTextBot,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && <TypingIndicator />}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask BrainBot anything..."
          placeholderTextColor={COLORS.mediumGrey}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          disabled={!input.trim() || isLoading}
          onPress={handleSend}
        >
          <IconSymbol name="paperplane.fill" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.black,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightPurple,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 18,
  },
  avatarTiny: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.lightPurple,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    alignSelf: "flex-end",
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  bubbleWrapperUser: {
    justifyContent: "flex-end",
  },
  bubbleWrapperBot: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
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
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
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
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  typingDots: {
    flexDirection: "row",
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
