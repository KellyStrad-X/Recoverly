import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

const functions = getFunctions(app);

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface RedFlag {
  severity: 'high' | 'moderate';
  reason: string;
  recommendation: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  instructions: string;
  safetyNotes: string;
}

export interface RecoveryProtocol {
  protocolName: string;
  aiGeneratedLabel: string;
  protocolSummary: string;
  bodyRegion: string;
  description: string;
  exercises: Exercise[];
  duration: string;
  frequency: string;
  disclaimer: string;
  safetyNotes?: string[];
  progressionNotes?: string;
}

export interface GenerateProtocolResponse {
  hasRedFlags: boolean;
  redFlags?: RedFlag[];
  shouldProceed: boolean;
  aiMessage?: string;
  quickReplies?: string[];
  protocol?: RecoveryProtocol;
  requiresPaywall: boolean;
}

export interface RefinePlanRequest {
  userId: string;
  currentPlan: any; // RehabPlan type
  conversationHistory: Message[];
  userMessage?: string;
  specificExercise?: Exercise;
  issue?: string;
}

export interface RefinePlanResponse {
  message: string;
  alternatives?: Exercise[];
  quickReplies?: string[];
  modifiedPlan?: any; // RehabPlan type
}

export interface GenerateProtocolRequest {
  userId: string;
  conversationHistory: Message[];
  userMessage: string;
}

export const generateRecoveryProtocol = async (
  request: GenerateProtocolRequest
): Promise<GenerateProtocolResponse> => {
  try {
    const generateProtocol = httpsCallable<
      GenerateProtocolRequest,
      GenerateProtocolResponse
    >(functions, 'generateRecoveryProtocol');

    const result = await generateProtocol(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling generateRecoveryProtocol:', error);
    throw new Error(
      error.message || 'Failed to generate recovery protocol. Please try again.'
    );
  }
};

export const refinePlan = async (
  request: RefinePlanRequest
): Promise<RefinePlanResponse> => {
  try {
    // For now, use a mock response until the Cloud Function is implemented
    // In production, this would call the actual Cloud Function

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock response based on the issue
    if (request.specificExercise && request.issue) {
      const exercise = request.specificExercise;

      // Generate alternatives based on the issue
      if (request.issue?.includes("hurt") || request.issue?.includes("pain")) {
        return {
          message: `I understand that ${exercise.name} is causing discomfort. Here are some gentler alternatives that work the same muscle groups:`,
          alternatives: [
            {
              name: `Modified ${exercise.name}`,
              sets: Math.max(1, exercise.sets - 1),
              reps: "8-10",
              instructions: `A gentler version: ${exercise.instructions} Focus on controlled movements and stop if you feel pain.`,
              safetyNotes: "Start slowly and listen to your body. This is a reduced-impact version.",
            },
            {
              name: "Wall Push-Ups" ,
              sets: 2,
              reps: "10-12",
              instructions: "Stand arm's length from a wall. Place hands flat against the wall at shoulder height. Lean forward and push back.",
              safetyNotes: "Keep your body straight. Adjust distance from wall to modify difficulty.",
            },
            {
              name: "Isometric Hold",
              sets: 3,
              reps: "20-30 seconds",
              instructions: "Hold the position without movement, focusing on muscle engagement without dynamic stress.",
              safetyNotes: "Breathe normally throughout. Stop if you feel any sharp pain.",
            }
          ],
          quickReplies: ["Show more alternatives", "Different issue", "Close"]
        };
      } else if (request.issue?.includes("easy")) {
        return {
          message: `Great progress! Let's make ${exercise.name} more challenging:`,
          alternatives: [
            {
              name: `Advanced ${exercise.name}`,
              sets: exercise.sets + 1,
              reps: "12-15",
              instructions: `Progression: ${exercise.instructions} Add a 2-second pause at the peak of each rep.`,
              safetyNotes: "Maintain proper form even as difficulty increases.",
            },
            {
              name: "Single-Leg Variation",
              sets: exercise.sets,
              reps: "8-10 each side",
              instructions: "Perform the exercise on one leg at a time to increase stability challenge.",
              safetyNotes: "Use support if needed for balance. Focus on control.",
            }
          ],
          quickReplies: ["Perfect!", "Still too easy", "Close"]
        };
      } else if (request.issue?.includes("difficult")) {
        return {
          message: `Let's scale back ${exercise.name} to build up your strength:`,
          alternatives: [
            {
              name: `Assisted ${exercise.name}`,
              sets: exercise.sets,
              reps: "6-8",
              instructions: `Easier variation: ${exercise.instructions} Use a chair or wall for support.`,
              safetyNotes: "Focus on form over speed. It's okay to take breaks between reps.",
            },
            {
              name: "Partial Range Version",
              sets: exercise.sets,
              reps: "8-10",
              instructions: "Perform the exercise through a smaller range of motion, gradually increasing as you get stronger.",
              safetyNotes: "Quality over quantity. Stop before fatigue compromises form.",
            }
          ],
          quickReplies: ["That helps", "Need easier", "Close"]
        };
      }
    }

    // General refinement response
    return {
      message: "I can help you adjust your recovery plan. What specific changes would you like to make?",
      quickReplies: [
        "An exercise hurts",
        "Too easy overall",
        "Too difficult overall",
        "Need schedule change",
        "Other concern"
      ]
    };

  } catch (error: any) {
    console.error('Error refining plan:', error);
    throw new Error(
      error.message || 'Failed to refine recovery plan. Please try again.'
    );
  }
};
