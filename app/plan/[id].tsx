import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPlanById } from '@/services/planService';
import type { RehabPlan } from '@/types/plan';
import SessionFlowModal from '@/components/SessionFlowModal';
import YouTubeModal from '@/components/YouTubeModal';
import { fetchExerciseMedia, type ExerciseMedia } from '@/services/exerciseMediaService';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<RehabPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [exerciseMedia, setExerciseMedia] = useState<Map<string, ExerciseMedia>>(new Map());
  const [loadingMediaIds, setLoadingMediaIds] = useState<Set<string>>(new Set());
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ videoId: string; title: string } | null>(null);

  useEffect(() => {
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const fetchedPlan = await getPlanById(id as string);

      if (!fetchedPlan) {
        Alert.alert('Error', 'Plan not found');
        router.back();
        return;
      }

      setPlan(fetchedPlan);
    } catch (error) {
      console.error('Error loading plan:', error);
      Alert.alert('Error', 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = async (exerciseId: string, exerciseName: string) => {
    const isCurrentlyExpanded = expandedExercises.has(exerciseId);

    setExpandedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });

    // If expanding and media not already loaded, fetch fresh per ExerciseDB ToS
    if (!isCurrentlyExpanded && !exerciseMedia.has(exerciseId)) {
      setLoadingMediaIds((prev) => new Set(prev).add(exerciseId));

      try {
        const media = await fetchExerciseMedia(exerciseId, exerciseName);
        setExerciseMedia((prev) => new Map(prev).set(exerciseId, media));
      } catch (error) {
        console.error(`Error fetching media for ${exerciseName}:`, error);
      } finally {
        setLoadingMediaIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(exerciseId);
          return newSet;
        });
      }
    }
  };

  const handleStartSession = () => {
    setSessionModalVisible(true);
  };

  const handleSessionComplete = () => {
    setSessionModalVisible(false);
    loadPlan(); // Refresh plan data
  };

  const handleWatchVideo = (videoId: string, title: string) => {
    setSelectedVideo({ videoId, title });
    setYoutubeModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66BB6A" />
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plan not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backToHomeButton}>
            <Text style={styles.backToHomeText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = Math.round((plan.currentDay / parseInt(plan.duration)) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle}>
          Recovery Plan
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Header */}
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.protocolName}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>

          {/* Progress Section */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Day {plan.currentDay + 1} of {plan.duration}</Text>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#66BB6A" />
                <Text style={styles.statText}>{plan.sessionsCompleted} sessions</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="calendar-sync" size={20} color="#66BB6A" />
                <Text style={styles.statText}>{plan.frequency}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Start Session Button */}
        <TouchableOpacity style={styles.startSessionButton} onPress={handleStartSession}>
          <MaterialCommunityIcons name="play-circle" size={28} color="#000000" />
          <Text style={styles.startSessionText}>Start Today's Session</Text>
        </TouchableOpacity>

        {/* Exercises List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises ({plan.exercises.length})</Text>
          {plan.exercises.map((exercise, index) => {
            const isExpanded = expandedExercises.has(exercise.id);
            return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => toggleExercise(exercise.id, exercise.name)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNumberBadge}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseHeaderContent}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseSetsReps}>
                      {exercise.sets} sets × {exercise.reps}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#8E8E93"
                  />
                </View>

                {isExpanded && (
                  <View style={styles.exerciseDetails}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Instructions</Text>
                      <Text style={styles.detailText}>{exercise.instructions}</Text>
                    </View>
                    {exercise.safetyNotes && (
                      <View style={styles.detailSection}>
                        <View style={styles.safetyHeader}>
                          <MaterialCommunityIcons name="shield-alert" size={18} color="#FF9800" />
                          <Text style={styles.safetyLabel}>Safety Notes</Text>
                        </View>
                        <Text style={styles.safetyText}>{exercise.safetyNotes}</Text>
                      </View>
                    )}

                    {/* Exercise GIF */}
                    {exerciseMedia.get(exercise.id)?.gifUrl && (
                      <View style={styles.gifContainer}>
                        <Image
                          source={{ uri: exerciseMedia.get(exercise.id)?.gifUrl }}
                          style={styles.exerciseGif}
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    {/* Watch Full Tutorial Button */}
                    {exerciseMedia.get(exercise.id)?.youtubeVideoId && (
                      <TouchableOpacity
                        style={styles.watchVideoButton}
                        onPress={() => {
                          const media = exerciseMedia.get(exercise.id);
                          if (media?.youtubeVideoId && media?.youtubeVideoTitle) {
                            handleWatchVideo(media.youtubeVideoId, media.youtubeVideoTitle);
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="play-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.watchVideoText}>Watch Full Tutorial</Text>
                      </TouchableOpacity>
                    )}

                    {/* Loading media indicator */}
                    {loadingMediaIds.has(exercise.id) && (
                      <View style={styles.loadingMediaContainer}>
                        <ActivityIndicator size="small" color="#66BB6A" />
                        <Text style={styles.loadingMediaText}>Loading visual aids...</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Safety Notes */}
        {plan.safetyNotes && plan.safetyNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.safetyNotesHeader}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#FF9800" />
              <Text style={styles.sectionTitle}>Safety Guidelines</Text>
            </View>
            <View style={styles.safetyNotesCard}>
              {plan.safetyNotes.map((note, index) => (
                <Text key={index} style={styles.safetyNoteItem}>
                  • {note}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>{plan.disclaimer}</Text>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Session Flow Modal */}
      {sessionModalVisible && plan && (
        <SessionFlowModal
          visible={sessionModalVisible}
          plan={plan}
          onClose={() => setSessionModalVisible(false)}
          onComplete={handleSessionComplete}
        />
      )}

      {/* YouTube Video Modal */}
      {youtubeModalVisible && selectedVideo && (
        <YouTubeModal
          visible={youtubeModalVisible}
          videoId={selectedVideo.videoId}
          videoTitle={selectedVideo.title}
          onClose={() => setYoutubeModalVisible(false)}
        />
      )}
    </SafeAreaView>
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
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: '#66BB6A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToHomeText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  planHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  planDescription: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  progressContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    color: '#66BB6A',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#66BB6A',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  startSessionButton: {
    backgroundColor: '#66BB6A',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startSessionText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseHeaderContent: {
    flex: 1,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseSetsReps: {
    color: '#66BB6A',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  safetyLabel: {
    color: '#FF9800',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  safetyText: {
    color: '#FF9800',
    fontSize: 14,
    lineHeight: 20,
  },
  safetyNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  safetyNotesCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    padding: 16,
  },
  safetyNoteItem: {
    color: '#FF9800',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  disclaimerCard: {
    marginHorizontal: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  disclaimerText: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  gifContainer: {
    marginTop: 16,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  exerciseGif: {
    width: '100%',
    height: 200,
  },
  watchVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#66BB6A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  watchVideoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingMediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  loadingMediaText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
