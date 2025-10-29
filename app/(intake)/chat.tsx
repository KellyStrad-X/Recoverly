import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { generateRecoveryProtocol, type Message as AIMessage } from '@/services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you create a personalized recovery plan. Where does it hurt?",
      timestamp: new Date(),
      quickReplies: ['Knee', 'Back', 'Shoulder', 'Neck', 'Other'],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Auto-send initial message if provided from dashboard
  useEffect(() => {
    if (params.initialMessage && !initialMessageSent && user) {
      const message = params.initialMessage as string;
      setInitialMessageSent(true);

      // Add user message to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to AI
      setIsTyping(true);
      sendMessageToAI(message);
    }
  }, [params.initialMessage, initialMessageSent, user]);

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

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

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

  const handleMicPress = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In production, this would stop the recording and process the audio
      Alert.alert(
        'Voice Input',
        'Voice recognition will be available soon! For now, please type your message.',
        [{ text: 'OK' }]
      );
    } else {
      // Start recording
      setIsRecording(true);

      // For web platform, use Web Speech API
      if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          Alert.alert('Error', 'Voice recognition failed. Please try typing instead.');
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } else {
        // For native platforms, show coming soon message
        setTimeout(() => {
          setIsRecording(false);
          Alert.alert(
            'Coming Soon!',
            'Voice input will be available in the next update. For now, please type your message.',
            [{ text: 'OK' }]
          );
        }, 500);
      }
    }
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            iconColor="#FFFFFF"
            size={24}
            onPress={() => router.back()}
          />
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Recovery Intake</Text>
            <Text style={styles.subtitle}>Chat with AI</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

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

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {/* TextInput with padding for mic button */}
            <TextInput
              style={[styles.input, {paddingLeft: 44}]}  // Add padding for mic button space
              placeholder={isRecording ? "Listening..." : "Describe your pain or issue..."}
              placeholderTextColor="#8E8E93"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isRecording}
            />

            {/* Mic button with absolute positioning */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                {
                  position: 'absolute',
                  left: 12,
                  bottom: 8,
                }
              ]}
              onPress={handleMicPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isRecording ? "microphone" : "microphone-outline"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Send button with absolute positioning */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
                {
                  position: 'absolute',
                  right: 12,
                  bottom: 8,
                }
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isRecording}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="send"
                size={20}
                color={inputText.trim() && !isRecording ? '#000000' : '#8E8E93'}
              />
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
  },
  messagesContainer: {
    flex: 1,
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
    position: 'relative',  // Important for absolute positioning of children
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 44,  // Space for send button
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3C',  // Subtle gray that matches the theme
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,  // Android shadow
    shadowColor: '#000',  // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    zIndex: 10,  // Ensure it's above other elements
  },
  micButtonRecording: {
    backgroundColor: '#FF3B30',  // Red when recording (iOS system red)
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,  // Android shadow
    shadowColor: '#000',  // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    zIndex: 10,  // Ensure it's above other elements
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
