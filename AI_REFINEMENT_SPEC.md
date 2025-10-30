# Recoverly AI Exercise Assignment Refinement Spec

**Created:** 2025-10-30
**Priority:** CRITICAL - Must be done before YouTube optimization
**Estimated Time:** 4-6 hours implementation

---

## 🎯 Executive Summary

The AI exercise assignment system currently has critical flaws that cause poor user experience:
- Recommends exercises requiring equipment users don't have
- Selects duplicate/similar exercises (e.g., 4 different bridge variations)
- No programmatic validation against approved exercise list
- Exercises don't match user's specific complaint (too generic)
- In-protocol AI assistant is missing/broken

**This must be fixed before optimizing YouTube search**, because perfect videos for the wrong exercises = 0% success rate.

---

## 🔴 Current Problems

### Problem 1: Equipment Mismatch
**Issue:** AI recommends band exercises to users without bands
**Impact:** User can't do the exercises → abandons protocol
**Example:** User gets "band wrist curl" but has no resistance bands

### Problem 2: No Validation
**Issue:** No code validation that AI-selected exercises exist in `rehab-exercises.json`
**Impact:** AI could hallucinate exercise names → YouTube search fails → no video found
**Current Flow:**
```
AI generates protocol → Returns exercise names → NO VALIDATION → Saved to Firestore
                                                        ↓
                                            Could be made-up exercises
```

### Problem 3: Duplicate Exercises
**Issue:** AI selects multiple variations of the same movement pattern
**Impact:** User does "pelvic tilt into bridge", "low glute bridge", "glute bridge march", "single leg bridge" → feels repetitive and boring
**Root Cause:** No deduplication logic for exercise families

### Problem 4: Generic Recommendations
**Issue:** AI doesn't target user's SPECIFIC complaint
**Impact:** User describes "outside elbow pain when gripping" but gets generic "elbow exercises" instead of lateral epicondylitis-specific exercises
**Root Cause:** System prompt doesn't emphasize specificity enough

### Problem 5: Broken In-Protocol Assistant
**Issue:** The AI assistant within active protocols doesn't work properly
**Impact:** Users can't get exercise substitutions or progress updates
**Root Cause:** Missing/incomplete implementation

---

## ✅ Solutions (Implementation Order)

### Solution 1: Equipment-Aware Exercise Selection

#### A. Add Equipment Question to Conversation Flow

**Location:** `functions/src/index.ts` - Update `SYSTEM_PROMPT`

**Add after line 192 (after RED FLAG DETECTION):**

```javascript
EQUIPMENT AVAILABILITY (ASK EARLY):
- After understanding their main complaint (1-2 exchanges), ASK if they have resistance bands
- This MUST be asked BEFORE generating the protocol
- Frame it naturally: "Do you have resistance bands at home, or should I focus on bodyweight-only exercises?"
- Quick replies: ["I have bands", "Bodyweight only", "Not sure what bands are"]

Example flow:
User: "My shoulder hurts when I reach overhead"
You: {"message": "Where exactly - front, side, or back of shoulder?", "quickReplies": ["Front", "Side", "Back", "All over"]}
User: "Side and back"
You: {"message": "Do you have resistance bands at home, or should I stick to bodyweight exercises?", "quickReplies": ["I have bands", "Bodyweight only", "Not sure"]}
User: "Bodyweight only"
You: {"message": "Got it. Any recent activities that might have triggered this?", "quickReplies": ["New workout", "Work changes", "Sports", "Nothing new"]}
[Then generate protocol with bodyweight-only exercises]

IF USER SAYS "Not sure what bands are":
Respond: {"message": "Resistance bands are stretchy exercise bands (about $10-15 on Amazon). They're great for rehab but not required. Should I focus on bodyweight exercises for now?", "quickReplies": ["Yes, bodyweight only", "I'll get bands", "I might have some"]}

IMPORTANT: Store their equipment response and ONLY select appropriate exercises:
- If "I have bands" or "I might have some" → Can use band exercises
- If "Bodyweight only" → NO band exercises whatsoever
```

#### B. Categorize Exercises by Equipment Type

**Replace lines 267-369 in SYSTEM_PROMPT with categorized lists:**

```javascript
APPROVED EXERCISES BY BODY PART:

Upper Legs (knee, hip, glute rehab):
BODYWEIGHT:
- pelvic tilt into bridge
- low glute bridge on floor
- glute bridge march
- single leg bridge with outstretched leg
- side hip abduction
- straight leg outer hip abductor
- side bridge hip abduction
- balance board
- lying (side) quads stretch
- hamstring stretch
- seated glute stretch
- twist hip lift
- walking lunge
- seated piriformis stretch
- flutter kicks
- bench hip extension

WITH BANDS:
- band single leg split squat

Waist/Core (lower back, core stability):
BODYWEIGHT ONLY:
- pelvic tilt
- dead bug
- curl-up
- side bridge v. 2
- front plank with twist
- bridge - mountain climber (cross body)
- reverse crunch
- spine twist
- bottoms-up
- cross body crunch
- crunch floor
- oblique crunches floor
- seated leg raise
- plank (if able)
- bird dog (if able)

Back (back pain, posture, upper back):
BODYWEIGHT:
- hyperextension
- hyperextension (on bench)
- sphinx
- spine stretch
- standing pelvic tilt
- upward facing dog
- kneeling lat stretch
- seated lower back stretch
- upper back stretch
- lower back curl

WITH BANDS:
- inverted row v. 2
- suspended row
- band close-grip pulldown

Lower Legs (ankle, calf rehab):
BODYWEIGHT ONLY:
- ankle circles
- bodyweight standing calf raise
- calf stretch with hands against wall
- standing calves calf stretch
- seated calf stretch (male)
- donkey calf raise
- circles knee stretch

Shoulders (shoulder rehab, mobility):
BODYWEIGHT:
- rear deltoid stretch

WITH BANDS:
- band shoulder press
- band front raise
- band y-raise
- band reverse fly
- band standing rear delt row
- band twisting overhead press

Chest/Upper Body (shoulder, chest mobility):
BODYWEIGHT ONLY:
- push-up (wall)
- push-up (wall) v. 2
- incline push-up
- chest and front of shoulder stretch
- dynamic chest stretch (male)
- push-up (only if user is able)

Lower Arms (elbow, wrist, forearm rehab):
BODYWEIGHT:
- side wrist pull stretch
- modified push up to lower arms
- wrist circles

WITH BANDS:
- band reverse wrist curl
- band wrist curl

Upper Arms (bicep, tricep rehab):
BODYWEIGHT:
- bench dip (knees bent)
- close-grip push-up
- diamond push-up
- overhead triceps stretch
- triceps dips floor
- bench dip on floor
- close-grip push-up (on knees)
- elbow dips

WITH BANDS:
- band alternating biceps curl
- band concentration curl
- band side triceps extension
- resistance band seated biceps curl

Neck (neck pain, stiffness):
BODYWEIGHT ONLY:
- side push neck stretch
- neck side stretch

EQUIPMENT SELECTION RULES:
- If user said "Bodyweight only" → ONLY select from "BODYWEIGHT" or "BODYWEIGHT ONLY" sections
- If user said "I have bands" → Can select from ANY section (bodyweight OR bands)
- If user said "Not sure" → Default to bodyweight only for safety
```

#### C. Add Programmatic Equipment Validation

**Location:** `functions/src/index.ts` after protocol parsing (around line 454)

```javascript
if (protocol) {
  // Load approved exercises with equipment info
  const approvedExercises = require('./rehab-exercises.json').exercises;

  // Check if user wants bodyweight only (scan conversation for this)
  const userWantsBodyweightOnly = conversationHistory.some(msg =>
    msg.role === 'user' &&
    (msg.content.toLowerCase().includes('bodyweight only') ||
     msg.content.toLowerCase().includes('no bands') ||
     msg.content.toLowerCase().includes('no equipment'))
  );

  if (userWantsBodyweightOnly) {
    // Filter out any band exercises
    const invalidExercises = protocol.exercises.filter(ex => {
      const exerciseData = approvedExercises.find(
        e => e.name.toLowerCase() === ex.name.toLowerCase()
      );
      return exerciseData && exerciseData.equipment.toLowerCase().includes('band');
    });

    if (invalidExercises.length > 0) {
      console.error('AI selected band exercises for bodyweight-only user:', invalidExercises);

      // Force AI to regenerate
      throw new functions.https.HttpsError(
        'invalid-argument',
        `User requested bodyweight only, but AI selected band exercises: ${invalidExercises.map(e => e.name).join(', ')}`
      );
    }
  }
}
```

---

### Solution 2: Validate Exercises Exist in Approved List

**Location:** `functions/src/index.ts` after protocol parsing (around line 454)

**Add this validation logic:**

```javascript
if (protocol) {
  // Load the approved exercise list
  const approvedExercises = require('./rehab-exercises.json').exercises;
  const approvedNames = approvedExercises.map(e => e.name.toLowerCase());

  // Validate each exercise exists
  const invalidExercises = protocol.exercises.filter(ex =>
    !approvedNames.includes(ex.name.toLowerCase())
  );

  if (invalidExercises.length > 0) {
    // Log error and reject protocol
    console.error('AI selected invalid exercises:', invalidExercises);

    // Force AI to regenerate with stricter prompt
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid exercises selected: ${invalidExercises.map(e => e.name).join(', ')}`
    );
  }
}
```

**Why this matters:**
- AI could hallucinate exercise names not in the approved list
- Prevents "Barbell Squat" or "Cable Face Pull" from slipping through
- Ensures YouTube search will work (because we're searching for real exercise names)

---

### Solution 3: Add Exercise Deduplication Logic

**Location:** Create new file `functions/src/exerciseDeduplication.ts`

```typescript
// Define exercise similarity groups
export const SIMILAR_EXERCISE_GROUPS = {
  'bridge_family': [
    'pelvic tilt into bridge',
    'low glute bridge on floor',
    'glute bridge march',
    'single leg bridge with outstretched leg'
  ],
  'plank_family': [
    'plank',
    'front plank with twist',
    'side bridge v. 2'
  ],
  'crunch_family': [
    'crunch floor',
    'cross body crunch',
    'oblique crunches floor',
    'curl-up',
    '3/4 sit-up'
  ],
  'push_up_family': [
    'push-up',
    'push-up (wall)',
    'push-up (wall) v. 2',
    'incline push-up',
    'close-grip push-up',
    'diamond push-up'
  ],
  'wrist_curl_family': [
    'band wrist curl',
    'band reverse wrist curl'
  ],
  'bicep_curl_family': [
    'band alternating biceps curl',
    'band concentration curl',
    'resistance band seated biceps curl'
  ],
  'shoulder_raise_family': [
    'band front raise',
    'band y-raise',
    'band shoulder press'
  ],
  'calf_raise_family': [
    'bodyweight standing calf raise',
    'donkey calf raise'
  ],
  'hyperextension_family': [
    'hyperextension',
    'hyperextension (on bench)'
  ]
};

/**
 * Remove duplicate exercises from the same family
 * Keeps only the first exercise from each family
 */
export function removeDuplicateExercises(exercises: Array<{name: string}>): Array<{name: string}> {
  const selectedGroups = new Set<string>();

  return exercises.filter(exercise => {
    const exerciseName = exercise.name.toLowerCase();

    // Find which group this exercise belongs to
    for (const [groupName, groupExercises] of Object.entries(SIMILAR_EXERCISE_GROUPS)) {
      if (groupExercises.some(e => e.toLowerCase() === exerciseName)) {
        // Already have an exercise from this group
        if (selectedGroups.has(groupName)) {
          console.log(`Removing duplicate: ${exercise.name} (already have exercise from ${groupName})`);
          return false; // Skip this duplicate
        }
        selectedGroups.add(groupName);
        return true;
      }
    }

    // Not in any group, keep it (it's unique)
    return true;
  });
}
```

**Usage in `functions/src/index.ts`:**

```javascript
import { removeDuplicateExercises } from './exerciseDeduplication';

// After protocol is validated (after line 454)
if (protocol) {
  // ... existing validation ...

  // Remove duplicates
  const originalCount = protocol.exercises.length;
  protocol.exercises = removeDuplicateExercises(protocol.exercises);

  if (protocol.exercises.length < originalCount) {
    console.log(`Removed ${originalCount - protocol.exercises.length} duplicate exercises`);
  }

  // Ensure we still have enough exercises (4-6 minimum)
  if (protocol.exercises.length < 4) {
    console.warn('Too few exercises after deduplication, may need to regenerate');
  }
}
```

---

### Solution 4: Improve Exercise Specificity

**Location:** `functions/src/index.ts` - Update `SYSTEM_PROMPT`

**Add after line 370 (after EXERCISE PRESCRIPTION GUIDELINES):**

```javascript
EXERCISE SPECIFICITY RULES (CRITICAL - READ THIS CAREFULLY):
The exercises you select MUST directly address the user's SPECIFIC complaint. Don't give generic protocols.

LISTEN TO THE DETAILS:
- Location of pain (inside vs outside elbow, front vs back of shoulder, etc.)
- Movement that triggers pain (gripping, reaching overhead, going down stairs, etc.)
- Activities that caused it (new sport, repetitive work, etc.)

MATCH EXERCISES TO SPECIFIC ISSUES:

Elbow Pain Examples:
❌ BAD: User says "outside elbow pain when gripping" → You select "overhead triceps stretch"
✅ GOOD: User says "outside elbow pain when gripping" → You select "band reverse wrist curl", "band wrist curl", "wrist circles" (lateral epicondylitis exercises)

❌ BAD: User says "inside elbow pain" → You select random arm exercises
✅ GOOD: User says "inside elbow pain" → You select "band wrist curl", "side wrist pull stretch" (medial epicondylitis exercises)

Knee Pain Examples:
❌ BAD: User says "knee pain going DOWN stairs" → You select "walking lunge"
✅ GOOD: User says "knee pain going DOWN stairs" → You select "pelvic tilt into bridge", "low glute bridge on floor" (eccentric control for patellofemoral pain)

❌ BAD: User says "knee pain after running" → You select "flutter kicks"
✅ GOOD: User says "knee pain after running" → You select "hamstring stretch", "seated glute stretch", "pelvic tilt into bridge" (runner's knee protocol)

Back Pain Examples:
❌ BAD: User says "lower back pain when bending forward" → You select "hyperextension"
✅ GOOD: User says "lower back pain when bending forward" → You select "pelvic tilt", "dead bug", "bird dog" (flexion intolerance exercises)

❌ BAD: User says "lower back stiffness in morning" → You select "crunch floor"
✅ GOOD: User says "lower back stiffness in morning" → You select "sphinx", "upward facing dog", "kneeling lat stretch" (extension and mobility)

Shoulder Pain Examples:
❌ BAD: User says "shoulder pain reaching overhead" → You select "band shoulder press"
✅ GOOD: User says "shoulder pain reaching overhead" → You select "band y-raise", "band reverse fly", "rear deltoid stretch" (rotator cuff and posterior shoulder)

❌ BAD: User says "shoulder pain from bench pressing" → You select "push-up (wall)"
✅ GOOD: User says "shoulder pain from bench pressing" → You select "band reverse fly", "rear deltoid stretch", "chest and front of shoulder stretch" (posterior shoulder strengthening + pec stretching)

THE RULE:
Ask yourself: "Does this exercise directly address the SPECIFIC movement pattern or muscle group causing their pain?"
If no → Don't select it
If yes → Include it

AVOID GENERIC "BODY PART" PROTOCOLS:
Don't just throw in random exercises for the body part. Be SURGICAL in your selection based on their specific description.
```

---

### Solution 5: Build In-Protocol AI Assistant

**Location:** Create new file `functions/src/protocolAssistant.ts`

```typescript
import * as functions from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import OpenAI from 'openai';

const openaiApiKey = defineString('OPENAI_API_KEY');

interface ProtocolAssistantRequest {
  userId: string;
  protocolId: string;
  userMessage: string;
  currentExercises: Array<{ name: string; bodyPart: string }>;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

const PROTOCOL_ASSISTANT_PROMPT = `You are an AI assistant helping users with their active Recoverly exercise protocol. Your role is:

1. **Exercise Substitutions** - Help users swap exercises that hurt or are too difficult
2. **Progress Updates** - Encourage users and track their progress
3. **Quick Questions** - Answer questions about form, pain, or the protocol

IMPORTANT CONSTRAINTS:
- You CANNOT regenerate or change the entire protocol
- You CAN only substitute individual exercises
- You MUST stay within the same body part when substituting
- You MUST use exercises from the approved list below

SUBSTITUTION RULES:
When a user says "This exercise hurts" or "This is too hard":
1. Ask clarifying questions (where does it hurt? sharp or dull? etc.)
2. Suggest 1-2 alternative exercises from the SAME body part
3. Explain why the alternative might work better
4. Use the exact exercise names from the approved list

Example substitution conversation:
User: "The glute bridge march hurts my lower back"
You: "Where in your lower back - more towards the sides or center?"
User: "Center, feels like strain"
You: "That suggests you might be overarching. Let's try 'pelvic tilt' instead - it teaches the same hip movement but with less back stress. Sound good?"

PROGRESS UPDATES:
- Celebrate milestones (Day 7 of 14! Halfway there!)
- Ask about pain changes (Is the pain better, same, or worse since starting?)
- Remind them of frequency (Remember to do this daily for best results)

ANSWERING QUESTIONS:
- Keep answers SHORT and actionable
- Focus on safety (when in doubt, recommend consulting a healthcare provider)
- Don't diagnose or prescribe

APPROVED EXERCISES BY BODY PART:
[Same categorized list as in main prompt - truncated here for brevity]

RESPONSE FORMAT:
Always respond with JSON containing message and optional quickReplies:
{
  "message": "Your response here",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "suggestedExercise": "exercise name" (optional - only for substitutions)
}`;

export const protocolAssistant = functions.https.onCall(
  async (request): Promise<{
    message: string;
    quickReplies?: string[];
    suggestedExercise?: string;
  }> => {
    const data = request.data as ProtocolAssistantRequest;

    // Check authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    if (data.userId !== request.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User ID does not match authenticated user.'
      );
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    try {
      // Build context about current protocol
      const exerciseContext = `Current exercises in protocol: ${data.currentExercises.map(e => e.name).join(', ')}`;

      const messages = [
        { role: 'system' as const, content: PROTOCOL_ASSISTANT_PROMPT },
        { role: 'user' as const, content: exerciseContext },
        ...data.conversationHistory,
        { role: 'user' as const, content: data.userMessage },
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500, // Shorter responses than protocol generation
      });

      const aiResponse = completion.choices[0].message.content || '';

      // Try to parse JSON response
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            message: parsed.message,
            quickReplies: parsed.quickReplies,
            suggestedExercise: parsed.suggestedExercise,
          };
        }
      } catch (e) {
        // Fall back to plain text
        console.warn('Failed to parse JSON from protocol assistant:', e);
      }

      // Return plain text response
      return {
        message: aiResponse,
      };
    } catch (error: any) {
      console.error('Error in protocol assistant:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to process request',
        error.message
      );
    }
  }
);
```

**Frontend Integration (Add to `functions/src/index.ts`):**

```javascript
// Export the new function
export { protocolAssistant } from './protocolAssistant';
```

---

## 📋 Implementation Checklist

- [ ] **Solution 1A:** Add equipment question to SYSTEM_PROMPT conversation flow
- [ ] **Solution 1B:** Categorize all exercises in SYSTEM_PROMPT by equipment type
- [ ] **Solution 1C:** Add programmatic equipment validation after protocol generation
- [ ] **Solution 2:** Add validation that exercises exist in `rehab-exercises.json`
- [ ] **Solution 3:** Create `exerciseDeduplication.ts` and integrate into protocol generation
- [ ] **Solution 4:** Add exercise specificity rules to SYSTEM_PROMPT
- [ ] **Solution 5:** Create `protocolAssistant.ts` for in-protocol AI assistant
- [ ] **Testing:** Test protocol generation with "bodyweight only" user
- [ ] **Testing:** Test protocol generation with "I have bands" user
- [ ] **Testing:** Verify deduplication works (should remove duplicate bridge exercises, etc.)
- [ ] **Testing:** Test in-protocol assistant for exercise substitutions
- [ ] **Testing:** Verify validation catches invalid exercise names

---

## 🧪 Testing Scenarios

### Test Case 1: Bodyweight Only User
```
Input: User complains about elbow pain, says "Bodyweight only"
Expected: Protocol contains only bodyweight exercises (wrist circles, side wrist pull stretch, modified push up to lower arms)
Should NOT contain: band wrist curl, band reverse wrist curl
```

### Test Case 2: User With Bands
```
Input: User complains about elbow pain, says "I have bands"
Expected: Protocol can contain band exercises (band wrist curl, band reverse wrist curl, wrist circles)
```

### Test Case 3: Invalid Exercise Detection
```
Input: AI somehow returns "Barbell Wrist Curl" (not in approved list)
Expected: HttpsError thrown, protocol rejected, AI forced to regenerate
```

### Test Case 4: Duplicate Exercise Removal
```
Input: AI returns protocol with "pelvic tilt into bridge", "low glute bridge on floor", "glute bridge march"
Expected: Deduplication keeps only first bridge exercise, removes the other two
Final count: 4-6 exercises (not all bridges)
```

### Test Case 5: Specificity Check
```
Input: User says "outside elbow pain when gripping" (lateral epicondylitis)
Expected: Protocol focuses on wrist extensors (band reverse wrist curl, wrist circles, side wrist pull stretch)
Should NOT contain: Generic arm exercises unrelated to the specific complaint
```

### Test Case 6: In-Protocol Substitution
```
Input: User in active protocol says "The glute bridge march hurts my back"
Expected: AI suggests "pelvic tilt" or "dead bug" as alternatives
AI explains why (less back stress)
Does NOT regenerate entire protocol
```

---

## 📊 Success Metrics

After implementation, track these metrics:

1. **Exercise Validity Rate:** % of generated protocols with 100% valid exercises
   - Target: 100% (all exercises in approved list)

2. **Equipment Match Rate:** % of protocols respecting user's equipment preference
   - Target: 100% (no bands for bodyweight-only users)

3. **Duplicate Rate:** Average # of duplicate exercise families per protocol
   - Target: 0 (no duplicates from same family)

4. **User Completion Rate:** % of users who complete assigned exercises
   - Target: Increase from baseline (measure before/after)

5. **Substitution Request Rate:** % of users requesting exercise swaps
   - Target: < 20% (indicates good initial assignment)

6. **Protocol Assistant Usage:** % of active protocols using the assistant
   - Target: > 50% engagement

---

## 🚀 Next Steps After This Work

Once AI assignment is working properly:

1. **Optimize YouTube Search** - Now that exercises are correct, find the best videos
2. **Pre-aggregate Video Cache** - Use Claude agent to warm up cache with all 333 exercises
3. **User Feedback Loop** - Collect data on which exercises users struggle with
4. **Progressive Difficulty** - Add logic to progress users from easier to harder exercises over time
5. **Multi-Week Protocols** - Extend beyond 14 days for chronic issues

---

## 💡 Additional Notes

- The system prompt is LONG (~370 lines) - this is necessary for quality
- GPT-4o-mini is fast enough for conversational responses (< 2 seconds)
- Consider upgrading to GPT-4o for protocol generation if quality isn't good enough
- Monitor OpenAI costs - each protocol generation ~500-1000 tokens
- Consider caching system prompt to reduce token usage

---

## 📞 Questions for Product Owner

Before implementing, clarify:

1. Should we allow users to change equipment preference mid-protocol?
2. What happens if user has bands but only wants bodyweight exercises? (respect their choice?)
3. Should in-protocol assistant allow adding NEW exercises, or only substitutions?
4. Do we need multi-language support for exercises? (currently English only)
5. Should we track which exercises users skip/can't complete? (product insight)

---

## 🔗 Related Files

- `functions/src/index.ts` - Main protocol generation logic (Lines 122-502)
- `functions/src/rehab-exercises.json` - Approved exercise list (333 exercises)
- `recoverly-app/src/services/exerciseMediaService.ts` - YouTube search (will be optimized later)
- `.env` - Contains OPENAI_API_KEY

---

## 📝 Code Review Checklist

Before merging:

- [ ] All validation logic has error handling
- [ ] Equipment filtering has unit tests
- [ ] Deduplication logic has unit tests
- [ ] In-protocol assistant properly authenticated
- [ ] System prompt changes reviewed for clarity
- [ ] Firebase Functions deployed and tested in staging
- [ ] OpenAI API costs estimated and approved
- [ ] User-facing error messages are friendly (no technical jargon)
- [ ] Logging added for monitoring AI quality
- [ ] Analytics events added for tracking success metrics
