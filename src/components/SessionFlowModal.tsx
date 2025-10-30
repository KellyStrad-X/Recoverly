import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Image,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAuthStore } from '@/stores/authStore';
import { createSessionLog, updatePlanProgress } from '@/services/planService';
import type { RehabPlan, Exercise } from '@/types/plan';
import { Timestamp } from 'firebase/firestore';
import YouTubeModal from './YouTubeModal';
import YoutubePlayer from 'react-native-youtube-iframe';
import { fetchExerciseMedia, type ExerciseMedia } from '@/services/exerciseMediaService';

type SessionStep = 'prePain' | 'exercises' | 'postPain' | 'notes' | 'complete';

interface Props {
  visible: boolean;
  plan: RehabPlan;
  onClose: () => void;
  onComplete: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SessionFlowModal({ visible, plan, onClose, onComplete }: Props) {
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<SessionStep>('prePain');
  const [prePainScore, setPrePainScore] = useState(5);
  const [postPainScore, setPostPainScore] = useState(5);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [exerciseMedia, setExerciseMedia] = useState<Map<string, ExerciseMedia>>(new Map());
  const [loadingMediaIds, setLoadingMediaIds] = useState<Set<string>>(new Set());
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ videoId: string; title: string } | null>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Load media for all exercises when modal opens
      plan.exercises.forEach(exercise => {
        loadExerciseMedia(exercise.id, exercise.name);
      });
    }
  }, [visible, plan]);

  const loadExerciseMedia = async (exerciseId: string, exerciseName: string) => {
    if (exerciseMedia.has(exerciseId) || loadingMediaIds.has(exerciseId)) return;

    setLoadingMediaIds(prev => new Set([...prev, exerciseId]));
    try {
      const media = await fetchExerciseMedia(exerciseId, exerciseName);
      if (media) {
        setExerciseMedia(prev => new Map(prev).set(exerciseId, media));
      }
    } catch (error) {
      console.error('Failed to fetch media for:', exerciseName);
    } finally {
      setLoadingMediaIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(exerciseId);
        return newSet;
      });
    }
  };

  const markExerciseComplete = () => {
    const currentExercise = plan.exercises[currentExerciseIndex];
    setCompletedExercises(prev => new Set([...prev, currentExercise.id]));

    // Auto-advance to next exercise or finish
    if (currentExerciseIndex < plan.exercises.length - 1) {
      animateToNextExercise();
    } else {
      // All exercises done, go to post-pain
      setStep('postPain');
    }
  };

  const animateToNextExercise = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentExerciseIndex(prev => prev + 1);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentExerciseIndex(prev => prev - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const skipExercise = () => {
    if (currentExerciseIndex < plan.exercises.length - 1) {
      animateToNextExercise();
    } else {
      setStep('postPain');
    }
  };

  const handleNextFromPrePain = () => {
    setStep('exercises');
    setCurrentExerciseIndex(0);
  };

  const handleNextFromPostPain = () => {
    setStep('notes');
  };

  const handleCompleteSession = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save session log - prepare data without undefined values
      const sessionData: any = {
        userId: user.uid,
        planId: plan.id,
        conditionId: plan.conditionId,
        prePainScore,
        postPainScore,
        exercisesCompleted: Array.from(completedExercises),
        sessionNumber: plan.sessionsCompleted + 1,
        weekNumber: Math.floor(plan.currentDay / 7) + 1,
      };

      // Only add notes if they exist
      if (notes && notes.trim()) {
        sessionData.notes = notes.trim();
      }

      await createSessionLog(sessionData);

      // Update plan progress
      await updatePlanProgress(plan.id, {
        sessionsCompleted: plan.sessionsCompleted + 1,
        currentDay: plan.currentDay + 1,
      });

      setStep('complete');
      setTimeout(() => {
        handleCompleteAndClose();
      }, 2000);
    } catch (error) {
      console.error('Error saving session:', error);
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
    setCurrentExerciseIndex(0);
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

  const renderExercisesStep = () => {
    const currentExercise = plan.exercises[currentExerciseIndex];
    const isCompleted = completedExercises.has(currentExercise.id);
    const media = exerciseMedia.get(currentExercise.id);
    const progress = ((currentExerciseIndex + 1) / plan.exercises.length) * 100;

    return (
      <View style={styles.fullScreenExerciseContainer}>
        {/* Progress Bar */}
        <View style={styles.exerciseProgressContainer}>
          <View style={styles.exerciseProgressBar}>
            <View style={[styles.exerciseProgressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.exerciseProgressText}>
            Exercise {currentExerciseIndex + 1} of {plan.exercises.length}
          </Text>
        </View>

        {/* Exercise Card */}
        <Animated.View
          style={[
            styles.exerciseCard,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.exerciseScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.exerciseScrollContent}
          >
            {/* Exercise Name */}
            <View style={styles.exerciseNameContainer}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <MaterialCommunityIcons name="check" size={16} color="#000000" />
                  <Text style={styles.completedBadgeText}>Done</Text>
                </View>
              )}
            </View>

            {/* Sets & Reps */}
            <View style={styles.exerciseSetsReps}>
              <View style={styles.exerciseMetric}>
                <Text style={styles.exerciseMetricValue}>{currentExercise.sets}</Text>
                <Text style={styles.exerciseMetricLabel}>Sets</Text>
              </View>
              <View style={styles.exerciseMetricDivider} />
              <View style={styles.exerciseMetric}>
                <Text style={styles.exerciseMetricValue}>{currentExercise.reps}</Text>
                <Text style={styles.exerciseMetricLabel}>Reps</Text>
              </View>
            </View>

            {/* Visual Aid - Inline YouTube Player */}
            {media && media.youtubeVideoId && (
              <>
                <View style={styles.exerciseMediaContainer}>
                  <YoutubePlayer
                    height={195}
                    videoId={media.youtubeVideoId}
                    play={false}
                    onError={(error) => {
                      console.warn('YouTube Player error:', error);
                    }}
                  />
                </View>

                {/* Optional: Fullscreen button */}
                <TouchableOpacity
                  style={styles.fullscreenButton}
                  onPress={() => {
                    setSelectedVideo({
                      videoId: media.youtubeVideoId!,
                      title: currentExercise.name,
                    });
                    setYoutubeModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="fullscreen" size={20} color="#FFFFFF" />
                  <Text style={styles.fullscreenButtonText}>View Fullscreen</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Loading indicator for media */}
            {loadingMediaIds.has(currentExercise.id) && (
              <View style={styles.mediaLoadingContainer}>
                <ActivityIndicator size="small" color="#66BB6A" />
                <Text style={styles.mediaLoadingText}>Loading tutorial video...</Text>
              </View>
            )}

            {/* Instructions */}
            <View style={styles.exerciseInstructionsContainer}>
              <Text style={styles.exerciseInstructionsTitle}>How to perform:</Text>
              <Text style={styles.exerciseInstructions}>{currentExercise.instructions}</Text>
            </View>

            {/* Safety Notes */}
            {currentExercise.safetyNotes && (
              <View style={styles.exerciseSafetyContainer}>
                <View style={styles.exerciseSafetyHeader}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#FFA726" />
                  <Text style={styles.exerciseSafetyTitle}>Safety Notes</Text>
                </View>
                <Text style={styles.exerciseSafetyText}>{currentExercise.safetyNotes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.exerciseActions}>
            <View style={styles.navigationButtons}>
              {currentExerciseIndex > 0 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={goToPreviousExercise}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color="#8E8E93" />
                  <Text style={styles.secondaryButtonText}>Previous</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipExercise}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {!isCompleted ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={markExerciseComplete}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#000000" />
                <Text style={styles.primaryButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={currentExerciseIndex < plan.exercises.length - 1 ? animateToNextExercise : () => setStep('postPain')}
              >
                <Text style={styles.primaryButtonText}>
                  {currentExerciseIndex < plan.exercises.length - 1 ? 'Next Exercise' : 'Continue'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#000000" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderPostPainStep = () => {
    const painChange = prePainScore - postPainScore;
    const improved = painChange > 0;
    const worsen = painChange < 0;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>How do you feel now?</Text>
          <Text style={styles.stepSubtitle}>Rate your pain after the exercises</Text>
        </View>

        <View style={styles.painScoreDisplay}>
          <Text style={styles.painEmoji}>{getPainEmoji(postPainScore)}</Text>
          <Text style={styles.painScore}>{postPainScore}/10</Text>
          <Text style={styles.painLabel}>{getPainLabel(postPainScore)}</Text>
        </View>

        {/* Pain Comparison */}
        {prePainScore !== postPainScore && (
          <View style={[styles.painComparison, improved && styles.painImproved, worsen && styles.painWorsened]}>
            <MaterialCommunityIcons
              name={improved ? 'trending-down' : 'trending-up'}
              size={20}
              color={improved ? '#66BB6A' : '#FF6B6B'}
            />
            <Text style={[styles.painComparisonText, improved && styles.painImprovedText, worsen && styles.painWorsenedText]}>
              {improved ? `Improved by ${painChange} point${painChange > 1 ? 's' : ''}` :
               worsen ? `Increased by ${Math.abs(painChange)} point${Math.abs(painChange) > 1 ? 's' : ''}` :
               'No change'}
            </Text>
          </View>
        )}

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

        <TouchableOpacity style={styles.primaryButton} onPress={handleNextFromPostPain}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotesStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Session Notes (Optional)</Text>
        <Text style={styles.stepSubtitle}>How did this session feel?</Text>
      </View>

      <TextInput
        style={styles.notesInput}
        placeholder="Any notes about this session?"
        placeholderTextColor="#8E8E93"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        keyboardAppearance="dark" // This makes the keyboard dark on iOS
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      <View style={styles.notesActions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleCompleteSession}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCompleteSession}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={20} color="#000000" />
              <Text style={styles.primaryButtonText}>Complete Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completeIconContainer}>
        <MaterialCommunityIcons name="check-circle" size={80} color="#66BB6A" />
      </View>
      <Text style={styles.completeTitle}>Great Work!</Text>
      <Text style={styles.completeSubtitle}>Session completed successfully</Text>

      <View style={styles.completeSummary}>
        <View style={styles.completeSummaryItem}>
          <MaterialCommunityIcons name="check-all" size={24} color="#66BB6A" />
          <Text style={styles.completeSummaryText}>
            {completedExercises.size} of {plan.exercises.length} exercises completed
          </Text>
        </View>
        {prePainScore !== postPainScore && (
          <View style={styles.completeSummaryItem}>
            <MaterialCommunityIcons
              name={prePainScore > postPainScore ? 'trending-down' : 'trending-up'}
              size={24}
              color={prePainScore > postPainScore ? '#66BB6A' : '#FFA726'}
            />
            <Text style={styles.completeSummaryText}>
              Pain: {prePainScore} → {postPainScore}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Session</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {step === 'prePain' && renderPrePainStep()}
        {step === 'exercises' && renderExercisesStep()}
        {step === 'postPain' && renderPostPainStep()}
        {step === 'notes' && renderNotesStep()}
        {step === 'complete' && renderCompleteStep()}

        {/* YouTube Modal */}
        {selectedVideo && (
          <YouTubeModal
            visible={youtubeModalVisible}
            videoId={selectedVideo.videoId}
            title={selectedVideo.title}
            onClose={() => setYoutubeModalVisible(false)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
    padding: 24,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  painScoreDisplay: {
    alignItems: 'center',
    marginBottom: 40,
  },
  painEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  painScore: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  painLabel: {
    fontSize: 18,
    color: '#8E8E93',
  },
  sliderContainer: {
    marginBottom: 40,
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
    fontSize: 14,
    color: '#8E8E93',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#66BB6A',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  painComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  painImproved: {
    backgroundColor: '#66BB6A20',
  },
  painWorsened: {
    backgroundColor: '#FF6B6B20',
  },
  painComparisonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  painImprovedText: {
    color: '#66BB6A',
  },
  painWorsenedText: {
    color: '#FF6B6B',
  },

  // Full Screen Exercise Styles
  fullScreenExerciseContainer: {
    flex: 1,
  },
  exerciseProgressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  exerciseProgressBar: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  exerciseProgressFill: {
    height: '100%',
    backgroundColor: '#66BB6A',
  },
  exerciseProgressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  exerciseCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseScrollView: {
    flex: 1,
  },
  exerciseScrollContent: {
    padding: 20,
  },
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66BB6A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  exerciseSetsReps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 24,
  },
  exerciseMetric: {
    flex: 1,
    alignItems: 'center',
  },
  exerciseMetricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#66BB6A',
    marginBottom: 4,
  },
  exerciseMetricLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  exerciseMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3A3A3C',
  },
  exerciseMediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  fullscreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    marginTop: 12,
    marginBottom: 24,
  },
  fullscreenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  mediaLoadingText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  exerciseInstructionsContainer: {
    marginBottom: 20,
  },
  exerciseInstructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  exerciseInstructions: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  exerciseSafetyContainer: {
    backgroundColor: '#FFA72620',
    borderRadius: 12,
    padding: 16,
  },
  exerciseSafetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  exerciseSafetyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFA726',
  },
  exerciseSafetyText: {
    fontSize: 14,
    color: '#FFA726',
    lineHeight: 20,
  },
  exerciseActions: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Notes Step
  notesInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
    height: 120,
    textAlignVertical: 'top',
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Complete Step
  completeIconContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  completeSummary: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
  },
  completeSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  completeSummaryText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});