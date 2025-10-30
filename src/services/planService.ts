import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Condition, RehabPlan, SessionLog, Message, Exercise } from '@/types/plan';

/**
 * Create a new condition and associated rehab plan in Firestore
 */
export const createConditionAndPlan = async (
  userId: string,
  conversationHistory: Message[],
  protocol: {
    protocolName: string;
    aiGeneratedLabel: string;
    protocolSummary: string;
    bodyRegion: string;
    description: string;
    exercises: any[];
    duration: string;
    frequency: string;
    disclaimer: string;
    safetyNotes?: string[];
    progressionNotes?: string;
  }
): Promise<{ conditionId: string; planId: string }> => {
  try {
    // Generate IDs
    const conditionRef = doc(collection(db, 'conditions'));
    const planRef = doc(collection(db, 'rehabPlans'));

    const conditionId = conditionRef.id;
    const planId = planRef.id;

    const now = Timestamp.now();

    // Create Condition document
    const condition: Omit<Condition, 'id'> = {
      userId,
      status: 'active',
      bodyRegion: protocol.bodyRegion,
      aiGeneratedLabel: protocol.aiGeneratedLabel,
      protocolSummary: protocol.protocolSummary,
      conversationHistory: conversationHistory.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? Timestamp.fromDate(msg.timestamp) : msg.timestamp,
      })),
      initialDescription: conversationHistory.find((m) => m.role === 'user')?.content || '',
      activePlanId: planId,
      createdAt: now,
    };

    // Create RehabPlan document
    const rehabPlan: Omit<RehabPlan, 'id'> = {
      conditionId,
      userId,
      protocolName: protocol.protocolName,
      description: protocol.description,
      exercises: protocol.exercises.map((ex, index) => ({
        ...ex,
        id: ex.id || `ex_${index}`,
        order: index,
      })),
      duration: protocol.duration,
      frequency: protocol.frequency,
      disclaimer: protocol.disclaimer,
      currentDay: 0,
      sessionsCompleted: 0,
      startDate: now,
      targetDurationWeeks: 2, // Default 2 weeks
      safetyNotes: protocol.safetyNotes || [],
      progressionNotes: protocol.progressionNotes || 'If pain improves, continue. If no change or worse after 2 weeks, consult a professional.',
      status: 'active',
      createdAt: now,
    };

    // Write to Firestore
    await setDoc(conditionRef, { ...condition, id: conditionId });
    await setDoc(planRef, { ...rehabPlan, id: planId });

    console.log('Created condition and plan:', { conditionId, planId });

    return { conditionId, planId };
  } catch (error) {
    console.error('Error creating condition and plan:', error);
    throw new Error('Failed to create recovery plan');
  }
};

/**
 * Get all active rehab plans for a user
 */
export const getUserActivePlans = async (userId: string): Promise<RehabPlan[]> => {
  try {
    const plansRef = collection(db, 'rehabPlans');
    const q = query(
      plansRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const plans: RehabPlan[] = [];

    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as RehabPlan);
    });

    return plans;
  } catch (error) {
    console.error('Error fetching user plans:', error);
    throw new Error('Failed to fetch recovery plans');
  }
};

/**
 * Get a single rehab plan by ID
 */
export const getPlanById = async (planId: string): Promise<RehabPlan | null> => {
  try {
    const planRef = doc(db, 'rehabPlans', planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return null;
    }

    return { id: planSnap.id, ...planSnap.data() } as RehabPlan;
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw new Error('Failed to fetch recovery plan');
  }
};

/**
 * Get condition by plan ID
 */
export const getConditionByPlanId = async (planId: string): Promise<Condition | null> => {
  try {
    const plan = await getPlanById(planId);
    if (!plan) return null;

    const conditionRef = doc(db, 'conditions', plan.conditionId);
    const conditionSnap = await getDoc(conditionRef);

    if (!conditionSnap.exists()) {
      return null;
    }

    return { id: conditionSnap.id, ...conditionSnap.data() } as Condition;
  } catch (error) {
    console.error('Error fetching condition:', error);
    throw new Error('Failed to fetch condition');
  }
};

/**
 * Update plan progress after a session
 */
export const updatePlanProgress = async (
  planId: string,
  sessionData: {
    sessionsCompleted: number;
    currentDay: number;
  }
): Promise<void> => {
  try {
    const planRef = doc(db, 'rehabPlans', planId);
    await updateDoc(planRef, {
      sessionsCompleted: sessionData.sessionsCompleted,
      currentDay: sessionData.currentDay,
    });

    console.log('Updated plan progress:', planId);
  } catch (error) {
    console.error('Error updating plan progress:', error);
    throw new Error('Failed to update progress');
  }
};

/**
 * Mark plan as completed
 */
export const completePlan = async (planId: string): Promise<void> => {
  try {
    const planRef = doc(db, 'rehabPlans', planId);
    await updateDoc(planRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
    });

    console.log('Marked plan as completed:', planId);
  } catch (error) {
    console.error('Error completing plan:', error);
    throw new Error('Failed to complete plan');
  }
};

/**
 * Create a session log
 */
export const createSessionLog = async (
  sessionData: Omit<SessionLog, 'id' | 'completedAt'> & { completedAt?: Timestamp }
): Promise<string> => {
  try {
    const sessionRef = doc(collection(db, 'sessionLogs'));
    const sessionId = sessionRef.id;

    const sessionLog: Omit<SessionLog, 'id'> = {
      ...sessionData,
      completedAt: sessionData.completedAt || Timestamp.now(),
    };

    await setDoc(sessionRef, { ...sessionLog, id: sessionId });

    console.log('Created session log:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('Error creating session log:', error);
    throw new Error('Failed to log session');
  }
};

/**
 * Get a condition by ID
 */
export const getConditionById = async (conditionId: string): Promise<Condition | null> => {
  try {
    const conditionRef = doc(db, 'conditions', conditionId);
    const conditionSnap = await getDoc(conditionRef);

    if (conditionSnap.exists()) {
      return { id: conditionSnap.id, ...conditionSnap.data() } as Condition;
    }
    return null;
  } catch (error) {
    console.error('Error fetching condition:', error);
    throw new Error('Failed to fetch condition');
  }
};

/**
 * Update a plan (for refinements)
 */
export const updatePlan = async (
  planId: string,
  updates: Partial<RehabPlan>
): Promise<void> => {
  try {
    const planRef = doc(db, 'rehabPlans', planId);

    // Convert dates to Timestamps if needed
    const processedUpdates: any = { ...updates };
    if (updates.lastModified && !(updates.lastModified instanceof Timestamp)) {
      processedUpdates.lastModified = Timestamp.fromDate(new Date(updates.lastModified as any));
    }

    await updateDoc(planRef, processedUpdates);
    console.log('Updated plan:', planId);
  } catch (error) {
    console.error('Error updating plan:', error);
    throw new Error('Failed to update plan');
  }
};

/**
 * Get recent session logs for a user (last 30 days)
 */
export const getUserRecentSessions = async (userId: string, days: number = 30): Promise<SessionLog[]> => {
  try {
    const sessionsRef = collection(db, 'sessionLogs');
    const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('completedAt', '>=', thirtyDaysAgo),
      orderBy('completedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const sessions: SessionLog[] = [];

    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as SessionLog);
    });

    return sessions;
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }
};

/**
 * Get completed plans count for a user
 */
export const getUserCompletedPlansCount = async (userId: string): Promise<number> => {
  try {
    const plansRef = collection(db, 'rehabPlans');
    const q = query(
      plansRef,
      where('userId', '==', userId),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching completed plans count:', error);
    return 0;
  }
};

/**
 * Calculate average pain from recent sessions
 */
export const calculateAveragePain = (sessions: SessionLog[]): number => {
  if (sessions.length === 0) return 0;

  const totalPain = sessions.reduce((sum, session) => {
    // Average the pre and post pain scores for each session
    return sum + ((session.prePainScore + session.postPainScore) / 2);
  }, 0);

  return Math.round(totalPain / sessions.length);
};
