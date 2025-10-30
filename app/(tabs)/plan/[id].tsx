import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, Card, Chip, ProgressBar } from 'react-native-paper';
import { useAuthStore } from '@/stores/authStore';
import { RehabPlan, Condition, Exercise } from '@/src/types/plan';
import { getPlanById, getConditionById, updatePlan } from '@/src/services/planService';
import PlanRefinementChat from '@/components/PlanRefinementChat';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [plan, setPlan] = useState<RehabPlan | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // Animation values
  const chatHeight = useRef(new Animated.Value(60)).current; // Collapsed height
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPlanData();
  }, [id, user]);

  const loadPlanData = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      const [planData, conditionData] = await Promise.all([
        getPlanById(id),
        // Assuming plan has conditionId
        getPlanById(id).then(p => p?.conditionId ? getConditionById(p.conditionId) : null)
      ]);

      if (planData) {
        setPlan(planData);
        setCondition(conditionData);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      Alert.alert('Error', 'Failed to load recovery plan');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanUpdate = async (updatedPlan: RehabPlan) => {
    setPlan(updatedPlan);
    // Update in Firestore
    await updatePlan(updatedPlan.id, updatedPlan);
  };

  const toggleChat = () => {
    const expanded = !isChatExpanded;
    setIsChatExpanded(expanded);

    Animated.parallel([
      Animated.timing(chatHeight, {
        toValue: expanded ? 400 : 60,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: expanded ? 0.3 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startSession = () => {
    if (!plan) return;
    router.push({
      pathname: '/(session)/start',
      params: { planId: plan.id, conditionId: plan.conditionId }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66BB6A" />
          <Text style={styles.loadingText}>Loading your recovery plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Recovery plan not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = plan.currentDay / (plan.targetDurationWeeks * 7);
  const daysRemaining = (plan.targetDurationWeeks * 7) - plan.currentDay;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            iconColor="#FFFFFF"
            size={24}
            onPress={() => router.back()}
          />
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{plan.protocolName}</Text>
            <Text style={styles.subtitle}>Day {plan.currentDay + 1} of {plan.targetDurationWeeks * 7}</Text>
          </View>
          <IconButton
            icon="dots-vertical"
            iconColor="#FFFFFF"
            size={24}
            onPress={() => {/* TODO: Show options menu */}}
          />
        </View>

        {/* Collapsible Chat Header */}
        <Animated.View style={[styles.chatContainer, { height: chatHeight }]}>
          <TouchableOpacity onPress={toggleChat} activeOpacity={0.8}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <MaterialCommunityIcons
                  name="robot"
                  size={24}
                  color="#66BB6A"
                />
                <View style={styles.chatHeaderText}>
                  <Text style={styles.chatTitle}>AI Recovery Assistant</Text>
                  <Text style={styles.chatSubtitle}>
                    {isChatExpanded ? "How can I help adjust your plan?" : "Tap to refine your exercises"}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={isChatExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color="#8E8E93"
              />
            </View>
          </TouchableOpacity>

          {/* Chat Content */}
          {isChatExpanded && plan && (
            <PlanRefinementChat
              plan={plan}
              condition={condition}
              onPlanUpdate={handlePlanUpdate}
              onClose={() => toggleChat()}
            />
          )}
        </Animated.View>

        {/* Main Content */}
        <Animated.ScrollView
          style={[styles.content, { opacity: contentOpacity }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Card */}
          <Card style={styles.progressCard}>
            <Card.Content>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Your Progress</Text>
                <Text style={styles.progressPercentage}>{Math.round(progressPercentage * 100)}%</Text>
              </View>
              <ProgressBar
                progress={progressPercentage}
                color="#66BB6A"
                style={styles.progressBar}
              />
              <View style={styles.progressStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{plan.sessionsCompleted}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{daysRemaining}</Text>
                  <Text style={styles.statLabel}>Days Left</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{plan.frequency}</Text>
                  <Text style={styles.statLabel}>Frequency</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Start Session Button */}
          <TouchableOpacity style={styles.startButton} onPress={startSession}>
            <MaterialCommunityIcons name="play-circle" size={24} color="#000000" />
            <Text style={styles.startButtonText}>Start Today's Session</Text>
          </TouchableOpacity>

          {/* Exercises List */}
          <View style={styles.exercisesSection}>
            <Text style={styles.sectionTitle}>Your Exercises</Text>
            {plan.exercises.map((exercise, index) => (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <Card.Content>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.wasReplaced && (
                      <Chip
                        mode="flat"
                        textStyle={styles.modifiedChip}
                        style={styles.modifiedChipContainer}
                      >
                        Modified
                      </Chip>
                    )}
                  </View>
                  <Text style={styles.exerciseSets}>
                    {exercise.sets} sets × {exercise.reps} reps
                  </Text>
                  <Text style={styles.exerciseInstructions} numberOfLines={2}>
                    {exercise.instructions}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          {/* Safety Notes */}
          {plan.safetyNotes && plan.safetyNotes.length > 0 && (
            <View style={styles.safetySection}>
              <Text style={styles.sectionTitle}>Safety Notes</Text>
              <Card style={styles.safetyCard}>
                <Card.Content>
                  {plan.safetyNotes.map((note, index) => (
                    <View key={index} style={styles.safetyNote}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#FFA726" />
                      <Text style={styles.safetyNoteText}>{note}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            </View>
          )}

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>{plan.disclaimer}</Text>
        </Animated.ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#66BB6A',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 2,
  },
  chatContainer: {
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    height: 60,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderText: {
    marginLeft: 12,
  },
  chatTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  progressCard: {
    margin: 16,
    backgroundColor: '#1C1C1E',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  progressPercentage: {
    color: '#66BB6A',
    fontSize: 24,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C2E',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#66BB6A',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  exercisesSection: {
    padding: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#1C1C1E',
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  modifiedChipContainer: {
    backgroundColor: '#66BB6A20',
  },
  modifiedChip: {
    color: '#66BB6A',
    fontSize: 11,
  },
  exerciseSets: {
    color: '#66BB6A',
    fontSize: 14,
    marginBottom: 4,
  },
  exerciseInstructions: {
    color: '#8E8E93',
    fontSize: 14,
    lineHeight: 20,
  },
  safetySection: {
    padding: 16,
  },
  safetyCard: {
    backgroundColor: '#1C1C1E',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  safetyNoteText: {
    color: '#FFA726',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  disclaimer: {
    color: '#8E8E93',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
});