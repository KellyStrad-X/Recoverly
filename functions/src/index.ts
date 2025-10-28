import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

admin.initializeApp();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GenerateProtocolRequest {
  userId: string;
  conversationHistory: Message[];
  userMessage: string;
}

interface RedFlag {
  severity: 'high' | 'moderate';
  reason: string;
  recommendation: string;
}

interface RecoveryProtocol {
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
}

interface GenerateProtocolResponse {
  hasRedFlags: boolean;
  redFlags?: RedFlag[];
  shouldProceed: boolean;
  aiMessage?: string;
  protocol?: RecoveryProtocol;
  requiresPaywall: boolean;
}

// Red flag detection patterns
const RED_FLAG_PATTERNS = {
  severe: [
    /severe pain/i,
    /unbearable/i,
    /10\/10 pain/i,
    /pain (level |score )?10/i,
    /can't (walk|move|stand)/i,
    /unable to (walk|move|stand)/i,
    /numbness/i,
    /tingling/i,
    /loss of (sensation|feeling)/i,
    /loss of control/i,
    /bladder|bowel/i,
    /chest pain/i,
    /difficulty breathing/i,
    /shortness of breath/i,
    /dizzy|dizziness/i,
    /fever/i,
    /recent (trauma|injury|accident)/i,
    /fall|fell/i,
    /hit my (head|neck|back)/i,
    /swelling/i,
    /deformity/i,
    /bone sticking out/i,
  ],
  moderate: [
    /pain (level |score )?[8-9]/i,
    /very severe/i,
    /getting worse/i,
    /worse (every day|each day|daily)/i,
    /shooting pain/i,
    /radiating|radiat/i,
    /down my leg|down my arm/i,
    /weakness/i,
  ],
};

function detectRedFlags(text: string): RedFlag[] {
  const redFlags: RedFlag[] = [];
  const lowerText = text.toLowerCase();

  // Check for severe red flags
  for (const pattern of RED_FLAG_PATTERNS.severe) {
    if (pattern.test(lowerText)) {
      redFlags.push({
        severity: 'high',
        reason: 'Severe symptoms detected that require immediate medical attention',
        recommendation: 'Please consult a healthcare provider immediately. These symptoms may indicate a serious condition that requires professional evaluation.',
      });
      break; // Only add one severe flag
    }
  }

  // Check for moderate red flags if no severe flags found
  if (redFlags.length === 0) {
    for (const pattern of RED_FLAG_PATTERNS.moderate) {
      if (pattern.test(lowerText)) {
        redFlags.push({
          severity: 'moderate',
          reason: 'Symptoms suggest professional evaluation may be beneficial',
          recommendation: 'We recommend consulting a healthcare provider before starting any recovery program. They can provide personalized guidance based on your specific condition.',
        });
        break;
      }
    }
  }

  return redFlags;
}

const SYSTEM_PROMPT = `You are a wellness-focused AI assistant for Recoverly, an app that provides general movement and recovery guidance. Your role is to have a brief conversation (2-4 exchanges) to understand the user's issue, then generate a simple recovery protocol.

IMPORTANT LEGAL POSITIONING:
- You provide GENERAL WELLNESS GUIDANCE, not medical advice or clinical rehabilitation
- You are NOT a substitute for healthcare providers
- Always include disclaimers about consulting healthcare professionals
- Never diagnose conditions or prescribe treatments

CONVERSATION APPROACH:
- Ask 2-3 clarifying questions to understand:
  1. Location and nature of discomfort
  2. Pain level (0-10 scale)
  3. When it started / aggravating activities
- Keep responses concise and conversational
- After gathering info, signal you're ready to generate a protocol

RED FLAG DETECTION:
If user mentions ANY of these, respond with concern and recommend professional consultation:
- Pain level 8+ out of 10
- Numbness, tingling, or loss of sensation
- Recent trauma or accident
- Inability to bear weight or move normally
- Fever, swelling, or deformity
- Chest pain or difficulty breathing
- Bladder/bowel control issues

PROTOCOL GENERATION:
When ready to generate, create a JSON response with this structure:
{
  "description": "Brief 2-3 sentence overview of the recovery approach",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 2,
      "reps": "10-15",
      "instructions": "Clear step-by-step instructions",
      "safetyNotes": "When to stop, what to avoid"
    }
  ],
  "duration": "14 days",
  "frequency": "Daily",
  "disclaimer": "This is general wellness guidance. Consult a healthcare provider if symptoms persist or worsen."
}

EXERCISE GUIDELINES:
- ONLY bodyweight exercises (no equipment required)
- Basic, safe movements (stretches, controlled movements, basic strength)
- 4-6 exercises maximum
- 2 sets, 10-15 reps (or time-based for stretches)
- Progressive approach (start gentle)
- Clear safety notes for each exercise

RESPONSE STYLE:
- Warm, supportive, professional
- Use simple language (no medical jargon)
- Be conservative - when in doubt, refer out
- Include disclaimers naturally in conversation`;

export const generateRecoveryProtocol = functions
  .runWith({
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onCall(
    async (
      data: GenerateProtocolRequest,
      context: functions.https.CallableContext
    ): Promise<GenerateProtocolResponse> => {
      // Check authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to generate recovery protocols.'
        );
      }

      const { userId, conversationHistory, userMessage } = data;

      // Verify user ID matches authenticated user
      if (userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'User ID does not match authenticated user.'
        );
      }

      // Initialize OpenAI with secret
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      try {
      // Detect red flags in all conversation history
      const allText = [
        ...conversationHistory.map((m) => m.content),
        userMessage,
      ].join(' ');

      const detectedRedFlags = detectRedFlags(allText);

      // If high severity red flags detected, return immediately
      if (detectedRedFlags.some((flag) => flag.severity === 'high')) {
        return {
          hasRedFlags: true,
          redFlags: detectedRedFlags,
          shouldProceed: false,
          requiresPaywall: false,
        };
      }

      // Build messages for OpenAI
      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0].message.content || '';

      // Try to parse as JSON protocol
      let protocol: RecoveryProtocol | undefined;
      let requiresPaywall = false;

      try {
        // Check if response contains JSON (protocol generation)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          protocol = JSON.parse(jsonMatch[0]);
          requiresPaywall = true; // Protocol generated, show paywall
        }
      } catch (e) {
        // Not JSON, just a conversational response
        protocol = undefined;
        requiresPaywall = false;
      }

      return {
        hasRedFlags: detectedRedFlags.length > 0,
        redFlags: detectedRedFlags.length > 0 ? detectedRedFlags : undefined,
        shouldProceed: true,
        aiMessage: protocol ? undefined : aiResponse,
        protocol,
        requiresPaywall,
      };
      } catch (error: any) {
        console.error('Error generating recovery protocol:', error);
        throw new functions.https.HttpsError(
          'internal',
          'Failed to generate recovery protocol',
          error.message
        );
      }
    }
  );
