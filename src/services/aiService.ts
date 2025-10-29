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
  description: string;
  exercises: Exercise[];
  duration: string;
  frequency: string;
  disclaimer: string;
}

export interface GenerateProtocolResponse {
  hasRedFlags: boolean;
  redFlags?: RedFlag[];
  shouldProceed: boolean;
  aiMessage?: string;
  protocol?: RecoveryProtocol;
  requiresPaywall: boolean;
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
