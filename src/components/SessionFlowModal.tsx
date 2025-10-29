import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAuthStore } from '@/stores/authStore';
import { createSessionLog, updatePlanProgress } from '@/services/planService';
import type { RehabPlan, Exercise } from '@/types/plan';
import { Timestamp } from 'firebase/firestore';

type SessionStep = 'prePain' | 'exercises' | 'postPain' | 'complete';

interface Props {
  visible: boolean;
  plan: RehabPlan;
  onClose: () => void;
  onComplete: () => void;
}

export default function SessionFlowModal({ visible, plan, onClose, onComplete }: Props) {
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<SessionStep>('prePain');
  const [prePainScore, setPrePainScore] = useState(5);
  const [postPainScore, setPostPainScore] = useState(5);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleNextFromPrePain = () => {
    setStep('exercises');
  };

  const handleNextFromExercises = () => {
    if (completedExercises.size === 0) {
      alert('Please complete at least one exercise');
      return;
    }
    setStep('postPain');
  };

  const handleFinish = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const sessionNumber = plan.sessionsCompleted + 1;
      const weekNumber = Math.ceil(sessionNumber / 7);

      // Create session log data
      const sessionData: any = {
        userId: user.uid,
        planId: plan.id,
        conditionId: plan.conditionId,
        prePainScore,
        postPainScore,
        exercisesCompleted: Array.from(completedExercises),
        sessionNumber,
        weekNumber,
      };

      // Only include notes if they exist
      if (notes.trim()) {
        sessionData.notes = notes.trim();
      }

      // Create session log
      await createSessionLog(sessionData);

      // Update plan progress
      await updatePlanProgress(plan.id, {
        sessionsCompleted: sessionNumber,
        currentDay: plan.currentDay + 1,
      });

      setStep('complete');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setStep('prePain');
    setPrePainScore(5);
    setPostPainScore(5);
    setCompletedExercises(new Set());
    setNotes('');
    onClose();
  };

  const handleCompleteAndClose = () => {
    handleClose();
    onComplete();
  };

  const getPainEmoji = (score: number) => {
    if (score === 0) return '😊';
    if (score <= 2) return '🙂';
    if (score <= 4) return '😐';
    if (score <= 6) return '😕';
    if (score <= 8) return '😣';
    return '😫';
  };

  const getPainLabel = (score: number) => {
    if (score === 0) return 'No Pain';
    if (score <= 2) return 'Mild';
    if (score <= 4) return 'Moderate';
    if (score <= 6) return 'Noticeable';
    if (score <= 8) return 'Severe';
    return 'Extreme';
  };

  const renderPrePainStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>How's your pain right now?</Text>
        <Text style={styles.stepSubtitle}>Rate your pain level before starting</Text>
      </View>

      <View style={styles.painScoreDisplay}>
        <Text style={styles.painEmoji}>{getPainEmoji(prePainScore)}</Text>
        <Text style={styles.painScore}>{prePainScore}/10</Text>
        <Text style={styles.painLabel}>{getPainLabel(prePainScore)}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={prePainScore}
          onValueChange={setPrePainScore}
          minimumTrackTintColor="#66BB6A"
          maximumTrackTintColor="#2C2C2E"
          thumbTintColor="#66BB6A"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>0 - No Pain</Text>
          <Text style={styles.sliderLabel}>10 - Worst</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNextFromPrePain}>
        <Text style={styles.primaryButtonText}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#000000" />
      </TouchableOpacity>
    </View>
  );

  const renderExercisesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Complete Your Exercises</Text>
        <Text style={styles.stepSubtitle}>
          Check off each exercise as you finish
        </Text>
      </View>

      <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
        {plan.exercises.map((exercise, index) => {
          const isCompleted = completedExercises.has(exercise.id);
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.exerciseItem, isCompleted && styles.exerciseItemCompleted]}
              onPress={() => toggleExercise(exercise.id)}
              activeOpacity={0.7}
            >
              <View style={styles.exerciseCheckbox}>
                {isCompleted && (
                  <MaterialCommunityIcons name="check" size={20} color="#000000" />
                )}
              </View>
              <View style={styles.exerciseContent}>
                <Text style={[styles.exerciseNameText, isCompleted && styles.exerciseNameCompleted]}>
                  {index + 1}. {exercise.name}
                </Text>
                <Text style={styles.exerciseSetsRepsText}>
                  {exercise.sets} sets × {exercise.reps}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.progressIndicator}>
        <Text style={styles.progressText}>
          {completedExercises.size} of {plan.exercises.length} exercises completed
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, completedExercises.size === 0 && styles.buttonDisabled]}
        onPress={handleNextFromExercises}
        disabled={completedExercises.size === 0}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#000000" />
      </TouchableOpacity>
    </View>
  );

  const renderPostPainStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>How's your pain now?</Text>
        <Text style={styles.stepSubtitle}>Rate your pain level after the session</Text>
      </View>

      <View style={styles.painScoreDisplay}>
        <Text style={styles.painEmoji}>{getPainEmoji(postPainScore)}</Text>
        <Text style={styles.painScore}>{postPainScore}/10</Text>
        <Text style={styles.painLabel}>{getPainLabel(postPainScore)}</Text>
      </View>

      {/* Pain Comparison */}
      <View style={styles.painComparisonCard}>
        <Text style={styles.comparisonLabel}>Pain Change</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonValue}>Before: {prePainScore}</Text>
          </View>
          <MaterialCommunityIcons
            name={postPainScore < prePainScore ? 'arrow-down' : postPainScore > prePainScore ? 'arrow-up' : 'minus'}
            size={24}
            color={postPainScore < prePainScore ? '#66BB6A' : postPainScore > prePainScore ? '#FF5252' : '#8E8E93'}
          />
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonValue}>After: {postPainScore}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={postPainScore}
          onValueChange={setPostPainScore}
          minimumTrackTintColor="#66BB6A"
          maximumTrackTintColor="#2C2C2E"
          thumbTintColor="#66BB6A"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>0 - No Pain</Text>
          <Text style={styles.sliderLabel}>10 - Worst</Text>
        </View>
      </View>

      {/* Optional Notes */}
      <View style={styles.notesContainer}>
        <Text style={styles.notesLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How did the session feel?"
          placeholderTextColor="#8E8E93"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={200}
          keyboardAppearance="dark"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>
          {saving ? 'Saving...' : 'Finish Session'}
        </Text>
        <MaterialCommunityIcons name="check" size={20} color="#000000" />
      </TouchableOpacity>
    </View>
  );

  const renderCompleteStep = () => {
    const painImproved = postPainScore < prePainScore;
    const painDiff = Math.abs(postPainScore - prePainScore);

    return (
      <View style={styles.stepContainer}>
        <View style={styles.celebrationContainer}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Session Complete!</Text>
          <Text style={styles.celebrationSubtitle}>
            Day {plan.currentDay + 2} • {plan.sessionsCompleted + 1} sessions total
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#66BB6A" />
            <Text style={styles.summaryText}>
              {completedExercises.size} exercises completed
            </Text>
          </View>
          {painImproved && painDiff > 0 && (
            <View style={styles.summaryRow}>
              <MaterialCommunityIcons name="trending-down" size={24} color="#66BB6A" />
              <Text style={styles.summaryText}>
                Pain decreased by {painDiff} point{painDiff > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteAndClose}>
          <Text style={styles.primaryButtonText}>Back to Plan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Session</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step Indicator */}
        {step !== 'complete' && (
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step === 'prePain' && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step === 'exercises' && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step === 'postPain' && styles.stepDotActive]} />
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 'prePain' && renderPrePainStep()}
          {step === 'exercises' && renderExercisesStep()}
          {step === 'postPain' && renderPostPainStep()}
          {step === 'complete' && renderCompleteStep()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  stepDotActive: {
    backgroundColor: '#66BB6A',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#2C2C2E',
  },
  scrollContent: {
    flex: 1,
  },
  stepContainer: {
    padding: 24,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  painScoreDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  painEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  painScore: {
    color: '#66BB6A',
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  painLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    color: '#8E8E93',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#66BB6A',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  exercisesList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseItemCompleted: {
    backgroundColor: '#1E2C1F',
    borderWidth: 1,
    borderColor: '#66BB6A',
  },
  exerciseCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#66BB6A',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseNameCompleted: {
    color: '#66BB6A',
  },
  exerciseSetsRepsText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  progressIndicator: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  progressText: {
    color: '#66BB6A',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  painComparisonCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  comparisonLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  celebrationTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    color: '#66BB6A',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
