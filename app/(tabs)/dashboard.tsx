import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
  Keyboard,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { generateRecoveryProtocol, type Message as AIMessage } from '@/services/aiService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Animation values
  const chatOpacity = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isChatExpanded) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isChatExpanded]);

  const expandToChat = () => {
    setIsChatExpanded(true);

    // Simple fade-in
    Animated.timing(chatOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const collapseToInput = () => {
    Keyboard.dismiss();

    Animated.timing(chatOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsChatExpanded(false);
      setMessages([]);
      setInputText('');
    });
  };

  const sendMessageToAI = async (messageContent: string) => {
    if (!user) return;

    try {
      const conversationHistory: AIMessage[] = messages
        .filter((m) => m.role === 'assistant' || m.role === 'user')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await generateRecoveryProtocol({
        userId: user.uid,
        conversationHistory,
        userMessage: messageContent,
      });

      setIsTyping(false);

      if (response.hasRedFlags && response.redFlags) {
        router.push({
          pathname: '/(intake)/red-flag-warning',
          params: {
            redFlags: JSON.stringify(response.redFlags),
          },
        });
        return;
      }

      if (response.requiresPaywall && response.protocol) {
        router.push({
          pathname: '/(intake)/paywall',
          params: {
            preview: JSON.stringify(response.protocol),
          },
        });
        return;
      }

      if (response.aiMessage) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.aiMessage,
          timestamp: new Date(),
          quickReplies: response.quickReplies,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error: any) {
      setIsTyping(false);
      Alert.alert(
        'Error',
        error.message || 'Failed to get AI response. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartChat = () => {
    if (!inputText.trim()) return;

    // Dismiss keyboard immediately
    Keyboard.dismiss();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const currentInput = inputText.trim();
    setMessages([userMessage]);
    setInputText('');

    // Expand to chat with animation
    expandToChat();

    // Send to AI
    setIsTyping(true);
    sendMessageToAI(currentInput);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    // Dismiss keyboard first
    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsTyping(true);

    sendMessageToAI(currentInput);
  };

  const handleQuickReply = (reply: string) => {
    if (!user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: reply,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    sendMessageToAI(reply);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isLastMessage = messages[messages.length - 1].id === item.id;
    const showQuickReplies = !isUser && item.quickReplies && isLastMessage && !isTyping;

    return (
      <View>
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {!isUser && (
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="robot" size={18} color="#66BB6A" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.aiText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>

        {/* Quick Reply Buttons */}
        {showQuickReplies && (
          <View style={styles.quickRepliesContainer}>
            {item.quickReplies!.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickReplyButton}
                onPress={() => handleQuickReply(reply)}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.aiAvatar}>
          <MaterialCommunityIcons name="robot" size={18} color="#66BB6A" />
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dashboard Content */}
      {!isChatExpanded && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          >
            <View style={styles.header}>
              <Text variant="headlineMedium" style={styles.greeting}>
                Hi, {user?.displayName?.split(' ')[0] || 'there'}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Ready to start your recovery?
              </Text>
            </View>

            <View style={styles.emptyState}>
              <Image
                source={require('../../misc/RecoverlyLogoHD.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text variant="titleLarge" style={styles.emptyTitle}>
                No Active Protocols
              </Text>
              <Text variant="bodyMedium" style={styles.emptyDescription}>
                Describe your pain or movement issue to get started with a personalized recovery plan.
              </Text>
            </View>

            {/* Inline Chat Input - OUTSIDE emptyState for full width */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Describe your pain or issue..."
                placeholderTextColor="#8E8E93"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                keyboardAppearance="dark"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  !inputText.trim() && styles.chatSendButtonDisabled,
                ]}
                onPress={handleStartChat}
                disabled={!inputText.trim()}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={inputText.trim() ? '#000000' : '#8E8E93'}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Chat Overlay - OUTSIDE KeyboardAvoidingView */}
      {isChatExpanded && (
          <Animated.View
            style={[
              styles.chatOverlay,
              {
                opacity: chatOpacity,
              },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={0}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={collapseToInput}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Messages */}
              <View style={styles.messagesContainer}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  ListFooterComponent={renderTypingIndicator}
                />
              </View>

              {/* Input Bar */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Describe your pain or issue..."
                    placeholderTextColor="#8E8E93"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    keyboardAppearance="dark"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !inputText.trim() && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                  >
                    <MaterialCommunityIcons
                      name="send"
                      size={20}
                      color={inputText.trim() ? '#000000' : '#8E8E93'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  header: {
    marginTop: 24,
    marginBottom: 40,
  },
  greeting: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 17,
  },
  emptyState: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 80,
    marginBottom: 16,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontSize: 15,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginBottom: 8,
  },
  chatInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  chatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chatSendButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  // Chat overlay styles
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    opacity: 0.9,
  },
  messagesContainer: {
    flex: 1,
    marginTop: 100,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#66BB6A',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#000000',
  },
  aiText: {
    color: '#FFFFFF',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 48,
    paddingRight: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  quickReplyButton: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#66BB6A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  quickReplyText: {
    color: '#66BB6A',
    fontSize: 15,
    fontWeight: '600',
  },
});
