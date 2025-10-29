import * as functions from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

// Define OpenAI API key as a parameter (reads from .env during deployment)
const openaiApiKey = defineString('OPENAI_API_KEY');

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
  quickReplies?: string[];
  protocol?: RecoveryProtocol;
  requiresPaywall: boolean;
}

// Red flag detection patterns (strict - only true warnings)
const RED_FLAG_PATTERNS = {
  warning: [
    // Severe pain indicators
    /unbearable/i,
    /worst pain (of my life|ever|imaginable)/i,
    /(pain|rate|score).{0,10}(9|10)\/10/i,
    /(9|10) out of 10/i,

    // Neurological red flags (combined symptoms)
    /numbness (and|with) weakness/i,
    /loss of control/i,
    /can't feel (my|anything)/i,

    // Bladder/bowel (serious)
    /bladder|bowel/i,
    /can't (urinate|pee|use bathroom)/i,

    // Cardiopulmonary
    /chest pain/i,
    /difficulty breathing/i,
    /shortness of breath/i,
    /can't (breathe|catch my breath)/i,

    // Recent trauma (within days)
    /(yesterday|today|last night).{0,30}(fell|accident|injury|trauma)/i,
    /(fell|accident|injury|trauma).{0,30}(yesterday|today|last night)/i,
    /just (fell|had an accident|injured)/i,

    // Complete inability to function
    /can't walk at all/i,
    /unable to (stand|bear weight|move)/i,
    /completely unable/i,

    // Visible structural issues
    /bone sticking out/i,
    /looks deformed/i,
    /visible deformity/i,

    // Progressive neurological
    /(getting|progressively) (weaker|numb)/i,
    /(weakness|numbness).{0,30}spreading/i,
  ],
};

function detectRedFlags(text: string): RedFlag[] {
  const redFlags: RedFlag[] = [];
  const lowerText = text.toLowerCase();

  // Check for warning-level red flags
  for (const pattern of RED_FLAG_PATTERNS.warning) {
    if (pattern.test(lowerText)) {
      redFlags.push({
        severity: 'moderate',
        reason: 'Your symptoms suggest professional evaluation may be beneficial',
        recommendation: 'We recommend consulting a healthcare provider before starting any recovery program. They can provide personalized guidance based on your specific condition.',
      });
      break; // Only add one flag
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

QUICK REPLY OPTIONS:
- For each conversational response, provide 2-4 quick reply options
- These help users respond quickly with common answers
- Format your conversational responses as JSON:
{
  "message": "Your question or response here",
  "quickReplies": ["Option 1", "Option 2", "Option 3"]
}

Examples:
{
  "message": "How would you describe the pain?",
  "quickReplies": ["Dull ache", "Sharp pain", "Stiffness", "Burning"]
}

{
  "message": "When did this start?",
  "quickReplies": ["Today", "This week", "A few weeks ago", "Longer"]
}

{
  "message": "On a scale of 0-10, how would you rate your pain right now?",
  "quickReplies": ["1-3 (Mild)", "4-6 (Moderate)", "7-8 (Severe)"]
}

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

export const generateRecoveryProtocol = functions.https.onCall(
  async (request): Promise<GenerateProtocolResponse> => {
    const data = request.data as GenerateProtocolRequest;

    // Check authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate recovery protocols.'
      );
    }

    const { userId, conversationHistory, userMessage } = data;

    // Verify user ID matches authenticated user
    if (userId !== request.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User ID does not match authenticated user.'
      );
    }

    // Initialize OpenAI with parameter
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    try {
      // Detect red flags in all conversation history
      const allText = [
        ...conversationHistory.map((m) => m.content),
        userMessage,
      ].join(' ');

      const detectedRedFlags = detectRedFlags(allText);

      // Red flags will be included in response but won't block the flow
      // User can see warning and decide to continue or seek professional help

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

      // Try to parse as JSON (could be protocol OR conversational with quick replies)
      let protocol: RecoveryProtocol | undefined;
      let aiMessage: string | undefined;
      let quickReplies: string[] | undefined;
      let requiresPaywall = false;

      try {
        // Check if response contains JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Check if it's a protocol (has exercises field)
          if (parsed.exercises && Array.isArray(parsed.exercises)) {
            protocol = parsed as RecoveryProtocol;
            requiresPaywall = true; // Protocol generated, show paywall
            aiMessage = undefined;
            quickReplies = undefined;
          }
          // Check if it's a conversational response with quick replies
          else if (parsed.message && parsed.quickReplies && Array.isArray(parsed.quickReplies)) {
            aiMessage = parsed.message;
            quickReplies = parsed.quickReplies;
            protocol = undefined;
            requiresPaywall = false;
          }
          // Fallback: treat entire JSON as message
          else {
            aiMessage = aiResponse;
            protocol = undefined;
            requiresPaywall = false;
          }
        } else {
          // Plain text response (no JSON)
          aiMessage = aiResponse;
          protocol = undefined;
          requiresPaywall = false;
        }
      } catch (e) {
        // JSON parse failed, use raw response
        aiMessage = aiResponse;
        protocol = undefined;
        requiresPaywall = false;
      }

      return {
        hasRedFlags: detectedRedFlags.length > 0,
        redFlags: detectedRedFlags.length > 0 ? detectedRedFlags : undefined,
        shouldProceed: true,
        aiMessage,
        quickReplies,
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
