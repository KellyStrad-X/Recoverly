import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
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
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { generateRecoveryProtocol, type Message as AIMessage } from '@/services/aiService';
import {
  getUserActivePlans,
  getUserRecentSessions,
  calculateAveragePain,
} from '@/services/planService';
import type { RehabPlan, SessionLog } from '@/types/plan';
import { LinearGradient } from 'expo-linear-gradient';
import DashboardTracking from '@/components/DashboardTracking';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Carousel constants
const SIDE_PADDING = 24;
const CARD_SPACING = 16;
const CARD_WIDTH = SCREEN_WIDTH - (SIDE_PADDING * 2);
const CARD_HEIGHT = 140;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
  protocol?: {
    description: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      instructions: string;
      safetyNotes: string;
    }>;
    duration: string;
    frequency: string;
    disclaimer: string;
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activePlans, setActivePlans] = useState<RehabPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [typewriterText, setTypewriterText] = useState('');
  const [recentSessions, setRecentSessions] = useState<SessionLog[]>([]);
  const [averagePain, setAveragePain] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const carouselRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Animation values
  const chatOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const dashboardContentOpacity = useRef(new Animated.Value(1)).current;
  const centerLogoOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (!isChatExpanded) {
          setIsKeyboardVisible(true);
          // Fade out header, dashboard content, and slide up logo
          Animated.parallel([
            Animated.timing(headerOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dashboardContentOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(logoTranslateY, {
              toValue: -100,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(centerLogoOpacity, {
              toValue: 0.75,
              duration: 600,
              useNativeDriver: true,
            }),
          ]).start();

          // Start pulse animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!isChatExpanded) {
          // Stop pulse animation
          pulseAnim.stopAnimation();
          pulseAnim.setValue(1);

          // Fade in header, dashboard content, and slide down logo
          Animated.parallel([
            Animated.timing(headerOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dashboardContentOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(logoTranslateY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(centerLogoOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Set keyboard invisible after animations complete
            setIsKeyboardVisible(false);
          });
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isChatExpanded, headerOpacity, logoTranslateY]);

  // Typewriter effect for "Recoverly Agent is Waiting..." - Looping
  useEffect(() => {
    if (isKeyboardVisible && !isChatExpanded) {
      const fullText = 'Recoverly Agent is Waiting...';
      let currentIndex = 0;
      let typeInterval: NodeJS.Timeout;
      let pauseTimeout: NodeJS.Timeout;
      let resetTimeout: NodeJS.Timeout;
      let isCancelled = false;

      const typewriterLoop = () => {
        if (isCancelled) return;

        typeInterval = setInterval(() => {
          if (currentIndex < fullText.length) {
            setTypewriterText(fullText.substring(0, currentIndex + 1));
            currentIndex++;
          } else {
            // Finished spelling
            clearInterval(typeInterval);
            pauseTimeout = setTimeout(() => {
              if (isCancelled) return;
              setTypewriterText('');
              resetTimeout = setTimeout(() => {
                if (isCancelled) return;
                currentIndex = 0;
                typewriterLoop();
              }, 500);
            }, 1000);
          }
        }, 50);
      };

      setTypewriterText('');
      typewriterLoop();

      return () => {
        isCancelled = true;
        clearInterval(typeInterval);
        clearTimeout(pauseTimeout);
        clearTimeout(resetTimeout);
      };
    } else {
      setTypewriterText('');
    }
  }, [isKeyboardVisible, isChatExpanded]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isChatExpanded) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isChatExpanded]);

  // Fetch active plans and tracking data on mount and when returning from paywall
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setActivePlans([]);
        setRecentSessions([]);
        setAveragePain(0);
        setLoadingPlans(false);
        return;
      }

      try {
        setLoadingPlans(true);

        // Fetch all data in parallel
        const [plans, sessions] = await Promise.all([
          getUserActivePlans(user.uid),
          getUserRecentSessions(user.uid, 30),
        ]);

        setActivePlans(plans);
        setRecentSessions(sessions);

        // Calculate average pain
        const avgPain = calculateAveragePain(sessions);
        setAveragePain(avgPain);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        Alert.alert('Error', 'Failed to load dashboard data');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Refresh plans when screen comes into focus (e.g., after paywall)
  useFocusEffect(
    React.useCallback(() => {
      if (user && !isChatExpanded) {
        getUserActivePlans(user.uid)
          .then(setActivePlans)
          .catch((error) => console.error('Error refreshing plans:', error));
      }
    }, [user, isChatExpanded])
  );

  const expandToChat = () => {
    setIsChatExpanded(true);

    // Stop pulse animation and hide center logo
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    Animated.timing(centerLogoOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();

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
        // Add protocol as a special message instead of navigating immediately
        const protocolMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I've created a personalized recovery plan for you!",
          timestamp: new Date(),
          protocol: response.protocol,
        };
        setMessages((prev) => [...prev, protocolMessage]);
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

  const handleSeeFullPlan = (protocol: Message['protocol']) => {
    if (!user || !protocol) return;

    // Check subscription status
    const isPaidUser = user.subscriptionStatus === 'active';

    if (isPaidUser) {
      // Navigate to plan detail screen (stub for now)
      router.push('/plan/new');
    } else {
      // Navigate to paywall with protocol preview and conversation history
      router.push({
        pathname: '/(intake)/paywall',
        params: {
          preview: JSON.stringify(protocol),
          conversationHistory: JSON.stringify(messages),
        },
      });
    }
  };

  const renderPlanCard = ({ item, index }: { item: RehabPlan; index: number }) => {
    // Calculate opacity based on scroll position for fade effect (horizontal)
    const scrollInterval = CARD_WIDTH + CARD_SPACING;
    const inputRange = [
      (index - 1) * scrollInterval,
      index * scrollInterval,
      (index + 1) * scrollInterval,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });

    // Calculate progress percentage
    const progressPercentage = item.sessionsCompleted > 0
      ? Math.round((item.sessionsCompleted / (item.sessionsCompleted + 1)) * 100)
      : 0;

    // Don't add marginRight to the last card
    const isLastCard = index === activePlans.length - 1;

    return (
      <Animated.View
        style={[
          styles.carouselCardWrapper,
          {
            opacity,
            transform: [{ scale }],
            marginRight: isLastCard ? 0 : CARD_SPACING,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push({
            pathname: '/(tabs)/plan/[id]',
            params: { id: item.id }
          })}
          style={styles.carouselCard}
        >
          <View style={styles.carouselCardContent}>
            <View style={styles.carouselCardLeft}>
              <Text style={styles.carouselCardTitle}>
                {item.aiGeneratedLabel || item.protocolName}
              </Text>
              <Text style={styles.carouselCardSubtitle}>
                Day {item.currentDay + 1} of {item.duration}
              </Text>
              <View style={styles.carouselCardStats}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#66BB6A" />
                <Text style={styles.carouselCardStatText}>
                  {item.sessionsCompleted} sessions completed
                </Text>
              </View>
            </View>

            {/* Circular progress - positioned top right */}
            <View style={styles.circularProgress}>
              <Text style={styles.circularProgressText}>{progressPercentage}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
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

        {/* Protocol Preview */}
        {!isUser && item.protocol && (
          <View style={styles.protocolPreviewContainer}>
            <View style={styles.protocolPreviewCard}>
              <Text style={styles.protocolPreviewTitle}>Your Recovery Plan</Text>

              <View style={styles.protocolStat}>
                <MaterialCommunityIcons name="dumbbell" size={16} color="#66BB6A" />
                <Text style={styles.protocolStatText}>
                  {item.protocol.exercises.length} exercises
                </Text>
              </View>

              <View style={styles.protocolStat}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#66BB6A" />
                <Text style={styles.protocolStatText}>
                  {item.protocol.duration} • {item.protocol.frequency}
                </Text>
              </View>

              <View style={styles.protocolStat}>
                <MaterialCommunityIcons name="target" size={16} color="#66BB6A" />
                <Text style={styles.protocolStatText}>
                  {item.protocol.description}
                </Text>
              </View>

              {/* Show first 2 exercises as teaser */}
              <View style={styles.protocolExerciseTeaser}>
                <Text style={styles.protocolExerciseTeaserTitle}>Includes:</Text>
                {item.protocol.exercises.slice(0, 2).map((exercise, index) => (
                  <Text key={index} style={styles.protocolExerciseTeaserItem}>
                    • {exercise.name}
                  </Text>
                ))}
                {item.protocol.exercises.length > 2 && (
                  <Text style={styles.protocolExerciseTeaserMore}>
                    + {item.protocol.exercises.length - 2} more exercises
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.seeFullPlanButton}
                onPress={() => handleSeeFullPlan(item.protocol)}
              >
                <Text style={styles.seeFullPlanButtonText}>See Full Plan</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
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
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.scrollContent}>
            <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
              <View style={styles.headerContent}>
                <View>
                  <Text variant="headlineMedium" style={styles.greeting}>
                    Hi, {user?.displayName?.split(' ')[0] || 'there'}
                  </Text>
                  <Text variant="bodyMedium" style={styles.subtitle}>
                    Ready to start your recovery?
                  </Text>
                </View>

                {/* Small logo - only show when plans exist */}
                {!loadingPlans && activePlans.length > 0 && (
                  <Image
                    source={require('../../misc/RecoverlyLogoHD.png')}
                    style={styles.smallLogo}
                    resizeMode="contain"
                  />
                )}
              </View>
            </Animated.View>

            {/* Loading State */}
            {loadingPlans && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#66BB6A" />
                <Text style={styles.loadingText}>Loading your protocols...</Text>
              </View>
            )}

            {/* Horizontal Carousel - Active Plans */}
            {!loadingPlans && activePlans.length > 0 && (
              <Animated.View style={{ opacity: dashboardContentOpacity, marginHorizontal: -24 }}>
                <View style={styles.carouselContainer}>
                  <Animated.FlatList
                    ref={carouselRef}
                    data={activePlans}
                    renderItem={renderPlanCard}
                    keyExtractor={(item) => item.id}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_SPACING}
                    decelerationRate="fast"
                    snapToAlignment="center"
                    contentContainerStyle={{
                      paddingHorizontal: SIDE_PADDING,
                    }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                  />
                </View>

                {/* Dashboard Tracking - Widgets & Calendar */}
                <DashboardTracking
                  averagePain={averagePain}
                  activePlansCount={activePlans.length}
                  recentSessions={recentSessions}
                />
              </Animated.View>
            )}

            {/* Empty State - No Plans */}
            {!loadingPlans && activePlans.length === 0 && (
              <Animated.View
                style={[
                  styles.emptyState,
                  { transform: [{ translateY: logoTranslateY }] }
                ]}
              >
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
              </Animated.View>
            )}
          </View>

          {/* Inline Chat Input - Positioned at bottom */}
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
        </KeyboardAvoidingView>
      )}

      {/* Pulsing Logo - Shows when keyboard is visible but chat not expanded */}
      {isKeyboardVisible && !isChatExpanded && (
        <>
          {/* Agent Is Waiting Text - Top Header */}
          <Animated.View style={[styles.waitingTextContainer, { opacity: centerLogoOpacity }]}>
            <Text style={styles.waitingText}>{typewriterText}</Text>
          </Animated.View>

          {/* Close Button - Top Right - Fixed visibility */}
          <TouchableOpacity
            style={styles.keyboardCloseButton}
            onPress={() => {
              console.log('Close button pressed');
              Keyboard.dismiss();
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Pulsing Logo */}
          <Animated.View
            style={[
              styles.centerLogoContainer,
              {
                opacity: centerLogoOpacity,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Image
              source={require('../../misc/RecoverlyLogoHD.png')}
              style={styles.centerLogo}
              resizeMode="contain"
            />
          </Animated.View>
        </>
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
    flex: 1,
    paddingHorizontal: 24,
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
    marginHorizontal: 24,
    marginBottom: 12,
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
  protocolPreviewContainer: {
    paddingLeft: 48,
    paddingRight: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  protocolPreviewCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#66BB6A',
    padding: 16,
  },
  protocolPreviewTitle: {
    color: '#66BB6A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  protocolStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  protocolStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  protocolExerciseTeaser: {
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  protocolExerciseTeaserTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protocolExerciseTeaserItem: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  protocolExerciseTeaserMore: {
    color: '#66BB6A',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  seeFullPlanButton: {
    backgroundColor: '#66BB6A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  seeFullPlanButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 15,
    marginTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  smallLogo: {
    width: 68,
    height: 68,
  },
  // Horizontal Carousel Styles
  carouselContainer: {
    height: CARD_HEIGHT + 24,
    marginBottom: 4,
  },
  carouselCardWrapper: {
    // marginRight is now handled dynamically in renderPlanCard
  },
  carouselCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.6)',
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  carouselCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  carouselCardLeft: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  carouselCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  carouselCardSubtitle: {
    color: '#66BB6A',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  carouselCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselCardStatText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 6,
  },
  circularProgress: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'rgba(102, 187, 106, 0.6)',
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressText: {
    color: '#66BB6A',
    fontSize: 13,
    fontWeight: '700',
  },
  // Center Logo (Pulsing)
  centerLogoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  centerLogo: {
    width: 120,
    height: 120,
  },
  keyboardCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  waitingTextContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  waitingText: {
    color: '#66BB6A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
