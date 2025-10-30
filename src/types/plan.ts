import { Timestamp } from 'firebase/firestore';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  instructions: string;
  safetyNotes: string;
  order: number;

  // Refinement tracking
  wasReplaced?: boolean;
  replacementReason?: string;
  originalExercise?: string;

  // Optional visual aids (for later)
  exerciseDbId?: string;
  exerciseDbGifUrl?: string;
  youtubeVideoId?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | Timestamp;
  quickReplies?: string[];
  exerciseOptions?: Exercise[];
  exerciseAlternatives?: Exercise[];
  protocol?: any; // For protocol preview messages
}

export interface Condition {
  id: string;
  userId: string;
  status: 'active' | 'resolved' | 'paused';

  // AI-generated metadata
  bodyRegion: string;              // "left_knee", "lower_back"
  aiGeneratedLabel: string;        // "Knee Pain Rehab"
  protocolSummary: string;         // AI's final summary message

  // Conversation history
  conversationHistory: Message[];
  initialDescription: string;      // User's first message

  // Linked plan
  activePlanId?: string;

  // Timestamps
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface ModificationHistory {
  date: Date | Timestamp;
  oldExercise: string;
  newExercise: string;
  reason: string;
}

export interface RehabPlan {
  id: string;
  conditionId: string;
  userId: string;

  // Protocol details
  protocolName: string;            // "Knee Mobility Protocol"
  description: string;
  exercises: Exercise[];
  duration: string;                // "14 days"
  frequency: string;               // "Daily" or "3-4 times per week"
  disclaimer: string;

  // Progress tracking
  currentDay: number;              // 0-based (0 = day 1)
  sessionsCompleted: number;
  startDate: Timestamp;
  targetDurationWeeks: number;     // 2 weeks typical

  // Refinement tracking
  lastModified?: Date | Timestamp;
  modificationHistory?: ModificationHistory[];
  refinementConversation?: Message[];

  // Safety notes
  safetyNotes: string[];
  progressionNotes: string;

  // Status
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface SessionLog {
  id: string;
  userId: string;
  planId: string;
  conditionId: string;

  completedAt: Timestamp;

  prePainScore: number;            // 0-10
  postPainScore: number;           // 0-10

  exercisesCompleted: string[];    // Array of exercise IDs
  notes?: string;

  sessionNumber: number;
  weekNumber: number;
}
