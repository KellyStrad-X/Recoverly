import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RehabPlan, Condition, Exercise, Message } from '@/src/types/plan';
import { refinePlan } from '@/src/services/aiService';
import { useAuthStore } from '@/stores/authStore';

interface PlanRefinementChatProps {
  plan: RehabPlan;
  condition: Condition | null;
  onPlanUpdate: (updatedPlan: RehabPlan) => void;
  onClose: () => void;
}

interface RefinementMessage extends Message {
  exerciseAlternatives?: Exercise[];
  targetExercise?: Exercise;
}

export default function PlanRefinementChat({
  plan,
  condition,
  onPlanUpdate,
  onClose,
}: PlanRefinementChatProps) {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<RefinementMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initialize with greeting
    const initialMessage: RefinementMessage = {
      id: '1',
      role: 'assistant',
      content: "How's your recovery going? I can help adjust exercises that aren't working for you or answer questions about your plan.",
      timestamp: new Date(),
      quickReplies: [
        "An exercise hurts",
        "Too easy",
        "Too difficult",
        "Need alternatives",
        "Progress update"
      ],
    };
    setMessages([initialMessage]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleQuickReply = (reply: string) => {
    const userMessage: RefinementMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: reply,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    if (reply === "An exercise hurts") {
      // Show exercise selection
      showExerciseSelection("Which exercise is causing pain?");
    } else if (reply === "Too easy") {
      showExerciseSelection("Which exercise feels too easy?");
    } else if (reply === "Too difficult") {
      showExerciseSelection("Which exercise is too challenging?");
    } else if (reply === "Need alternatives") {
      showExerciseSelection("Which exercise would you like alternatives for?");
    } else {
      // Handle general refinement
      handleRefinement(reply);
    }
  };

  const showExerciseSelection = (prompt: string) => {
    const exerciseSelectionMessage: RefinementMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: prompt,
      timestamp: new Date(),
      exerciseOptions: plan.exercises,
    };
    setMessages(prev => [...prev, exerciseSelectionMessage]);
  };

  const handleExerciseSelect = async (exercise: Exercise, issue: string) => {
    setSelectedExercise(exercise);

    const userMessage: RefinementMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `${exercise.name} - ${issue}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);

    try {
      const response = await refinePlan({
        userId: user?.uid || '',
        currentPlan: plan,
        specificExercise: exercise,
        issue: issue,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
      });

      setIsTyping(false);

      if (response.alternatives && response.alternatives.length > 0) {
        const alternativesMessage: RefinementMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || "Here are some alternative exercises that might work better for you:",
          timestamp: new Date(),
          exerciseAlternatives: response.alternatives,
          targetExercise: exercise,
        };
        setMessages(prev => [...prev, alternativesMessage]);
      } else {
        const responseMessage: RefinementMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || "I understand. Let me help you with that.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, responseMessage]);
      }
    } catch (error) {
      setIsTyping(false);
      Alert.alert('Error', 'Failed to get refinement suggestions. Please try again.');
    }
  };

  const handleRefinement = async (userInput: string) => {
    setIsTyping(true);

    try {
      const response = await refinePlan({
        userId: user?.uid || '',
        currentPlan: plan,
        userMessage: userInput,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
      });

      setIsTyping(false);

      const aiMessage: RefinementMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        quickReplies: response.quickReplies,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setIsTyping(false);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
    }
  };

  const replaceExercise = async (oldExercise: Exercise, newExercise: Exercise) => {
    // Update the plan with the new exercise
    const updatedExercises = plan.exercises.map(ex =>
      ex.id === oldExercise.id ? { ...newExercise, id: oldExercise.id, wasReplaced: true } : ex
    );

    const updatedPlan = {
      ...plan,
      exercises: updatedExercises,
      lastModified: new Date(),
      modificationHistory: [
        ...(plan.modificationHistory || []),
        {
          date: new Date(),
          oldExercise: oldExercise.name,
          newExercise: newExercise.name,
          reason: `User reported: ${selectedExercise?.name} - issue`,
        }
      ]
    };

    onPlanUpdate(updatedPlan);

    // Confirmation message
    const confirmMessage: RefinementMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Great! I've replaced "${oldExercise.name}" with "${newExercise.name}" in your plan. This should be more suitable for your current needs.`,
      timestamp: new Date(),
      quickReplies: ["Thanks!", "Modify another", "Close chat"],
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: RefinementMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    handleRefinement(inputText.trim());
  };

  const renderMessage = ({ item }: { item: RefinementMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={styles.messageWrapper}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}>
          {!isUser && (
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="robot" size={16} color="#66BB6A" />
            </View>
          )}
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText,
          ]}>
            {item.content}
          </Text>
        </View>

        {/* Quick Replies */}
        {item.quickReplies && (
          <View style={styles.quickRepliesContainer}>
            {item.quickReplies.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickReplyButton}
                onPress={() => {
                  if (reply === "Close chat") {
                    onClose();
                  } else if (reply === "Modify another") {
                    handleQuickReply("An exercise hurts");
                  } else {
                    handleQuickReply(reply);
                  }
                }}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Exercise Options */}
        {item.exerciseOptions && (
          <View style={styles.exerciseOptionsContainer}>
            {item.exerciseOptions.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseOption}
                onPress={() => handleExerciseSelect(exercise, "needs modification")}
              >
                <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Alternative Exercises */}
        {item.exerciseAlternatives && (
          <View style={styles.alternativesContainer}>
            {item.exerciseAlternatives.map((alt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.alternativeCard}
                onPress={() => {
                  if (item.targetExercise) {
                    replaceExercise(item.targetExercise, alt);
                  }
                }}
              >
                <View style={styles.alternativeHeader}>
                  <Text style={styles.alternativeName}>{alt.name}</Text>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#66BB6A" />
                </View>
                <Text style={styles.alternativeSets}>
                  {alt.sets} sets × {alt.reps} reps
                </Text>
                <Text style={styles.alternativeInstructions} numberOfLines={2}>
                  {alt.instructions}
                </Text>
                <View style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Select This Alternative</Text>
                </View>
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
    <View style={styles.container}>
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
        <TextInput
          style={styles.input}
          placeholder="Ask about your exercises..."
          placeholderTextColor="#8E8E93"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  messagesList: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#66BB6A',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#000000',
  },
  aiText: {
    color: '#FFFFFF',
    flex: 1,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingLeft: 36,
  },
  quickReplyButton: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#66BB6A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  quickReplyText: {
    color: '#66BB6A',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseOptionsContainer: {
    marginTop: 12,
    paddingLeft: 36,
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseOptionName: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
  },
  alternativesContainer: {
    marginTop: 12,
    paddingLeft: 36,
  },
  alternativeCard: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alternativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternativeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeSets: {
    color: '#66BB6A',
    fontSize: 14,
    marginBottom: 4,
  },
  alternativeInstructions: {
    color: '#8E8E93',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: '#66BB6A20',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#66BB6A',
    fontSize: 14,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginLeft: 36,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
});