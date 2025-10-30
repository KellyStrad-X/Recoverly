# Recoverly AI Exercise Assignment Refinement Spec v2

**Updated:** 2025-10-30 (Post-Exercise List Cleanup)
**Priority:** CRITICAL - Must be done before YouTube optimization
**Estimated Time:** 2-3 hours implementation

---

## 🎯 Executive Summary

We've cleaned up the exercise list from 333 (ExerciseDB) to **120 purpose-built rehab exercises**. Now the AI needs updating to:
- Use the new simplified exercise names
- Ask about equipment availability (bands vs bodyweight)
- Validate exercises exist in the list
- Target user's specific complaint (not generic)
- Provide in-protocol assistance for substitutions

**Much simpler than before** - no complex deduplication needed since we removed all the duplicate variations.

---

## 🔴 Current Problems

### Problem 1: Equipment Mismatch
**Issue:** AI recommends band exercises to users without bands
**Impact:** User can't do the exercises → abandons protocol
**Example:** User gets "band wrist curl" but has no resistance bands

### Problem 2: No Validation
**Issue:** No code validation that AI-selected exercises exist in `rehab-exercises.json`
**Impact:** AI could hallucinate exercise names → YouTube search fails
**Solution:** Simple validation against 120-exercise list

### Problem 3: Generic Recommendations
**Issue:** AI doesn't target user's SPECIFIC complaint
**Impact:** User describes "outside elbow pain when gripping" but gets generic "elbow exercises"
**Solution:** Update prompt to emphasize specificity

### Problem 4: Broken In-Protocol Assistant
**Issue:** The AI assistant within active protocols doesn't work properly
**Impact:** Users can't get exercise substitutions or progress updates
**Solution:** Create dedicated protocol assistant function

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

#### B. Updated Exercise List by Body Part

**Replace the entire APPROVED EXERCISES section with:**

```javascript
APPROVED EXERCISES BY BODY PART:

Lower Back & Core:
BODYWEIGHT:
- pelvic tilt
- cat cow stretch
- bird dog
- dead bug
- bridge
- glute bridge
- plank
- side plank
- child's pose
- cobra stretch
- prone press up
- seated spinal twist
- supine twist
- pelvic clock
- abdominal bracing
- diaphragmatic breathing
- seated trunk rotation
- standing trunk rotation

WITH BANDS:
- band pallof press
- band wood chop

Hips & Glutes:
BODYWEIGHT:
- clamshell
- fire hydrant
- side lying leg raise
- seated piriformis stretch
- figure 4 stretch
- hip flexor stretch
- kneeling hip flexor stretch
- IT band stretch
- 90-90 hip stretch
- frog stretch
- groin stretch
- butterfly stretch
- side stepping
- single leg deadlift

WITH BANDS:
- monster walk
- lateral band walk

Legs & Knees:
BODYWEIGHT:
- wall sit
- step up
- step down
- mini squat
- lunge
- reverse lunge
- side lunge
- straight leg raise
- short arc quad
- quad set
- heel slide
- sit to stand
- prone knee bend
- backward walking

Ankles & Feet:
BODYWEIGHT ONLY:
- ankle circles
- ankle alphabet
- calf raise
- single leg calf raise
- wall calf stretch
- standing calf stretch
- soleus stretch
- towel calf stretch
- single leg balance
- toe raises
- heel walks
- toe walks
- plantar fascia stretch
- toe spread
- kneeling ankle mobility
- seated ankle pumps
- heel to toe walk

Shoulders & Upper Back:
BODYWEIGHT:
- shoulder rolls
- arm circles
- wall angel
- pendulum exercise
- scapular squeeze
- upper back stretch
- thoracic rotation
- doorway chest stretch
- pec stretch
- lat stretch
- cross body shoulder stretch
- sleeper stretch

WITH BANDS:
- band pull apart
- band row
- band reverse fly
- band external rotation
- band internal rotation
- band shoulder press
- band lateral raise
- band front raise
- seated rows
- lat pulldown
- face pull

Neck:
BODYWEIGHT ONLY:
- neck rotation
- neck side bend
- chin tuck

Arms & Wrists:
BODYWEIGHT:
- wrist circles
- wrist flexor stretch
- wrist extensor stretch
- tricep stretch

WITH BANDS:
- band bicep curl
- band tricep extension
- band wrist curl
- band wrist extension

Stretches (use these to supplement protocols):
BODYWEIGHT ONLY:
- hamstring stretch
- standing hamstring stretch
- quad stretch
- standing quad stretch

Balance & Functional:
BODYWEIGHT ONLY:
- tandem stance
- single leg balance

EQUIPMENT SELECTION RULES:
- If user said "Bodyweight only" → ONLY select from "BODYWEIGHT" or "BODYWEIGHT ONLY" sections
- If user said "I have bands" → Can select from ANY section (bodyweight OR bands)
- For each body region, select 1-2 exercises that directly target the user's specific complaint
- Always include at least one stretch for the affected area
```

#### C. Add Programmatic Equipment Validation

**Location:** `functions/src/index.ts` after protocol parsing (around line 454)

```javascript
if (protocol) {
  // Load approved exercises
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

      throw new functions.https.HttpsError(
        'invalid-argument',
        `User requested bodyweight only, but AI selected band exercises: ${invalidExercises.map(e => e.name).join(', ')}`
      );
    }
  }

  // Also validate exercises exist in approved list
  const approvedNames = approvedExercises.map(e => e.name.toLowerCase());
  const nonExistentExercises = protocol.exercises.filter(ex =>
    !approvedNames.includes(ex.name.toLowerCase())
  );

  if (nonExistentExercises.length > 0) {
    console.error('AI selected non-existent exercises:', nonExistentExercises);

    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid exercises selected: ${nonExistentExercises.map(e => e.name).join(', ')}`
    );
  }
}
```

---

### Solution 2: Improve Exercise Specificity

**Location:** `functions/src/index.ts` - Update `SYSTEM_PROMPT`

**Add after the APPROVED EXERCISES section:**

```javascript
EXERCISE SPECIFICITY RULES (CRITICAL):
The exercises you select MUST directly address the user's SPECIFIC complaint.

LISTEN TO THE DETAILS:
- Location of pain (inside vs outside elbow, front vs back of shoulder, etc.)
- Movement that triggers pain (gripping, reaching overhead, going down stairs, etc.)
- Activities that caused it (new sport, repetitive work, etc.)

MATCH EXERCISES TO SPECIFIC ISSUES:

Lower Back Pain:
❌ BAD: User says "lower back pain when bending forward" → You select random core exercises
✅ GOOD: User says "lower back pain when bending forward" → You select:
  - pelvic tilt (teaches neutral spine)
  - dead bug (core stability without flexion)
  - bird dog (core control)
  - child's pose (gentle stretch)

Shoulder Pain:
❌ BAD: User says "shoulder pain reaching overhead" → You select "shoulder rolls"
✅ GOOD: User says "shoulder pain reaching overhead" → You select:
  - band external rotation (rotator cuff strength)
  - band reverse fly (posterior shoulder)
  - sleeper stretch (internal rotation)
  - wall angel (overhead mobility)

Knee Pain:
❌ BAD: User says "knee pain going DOWN stairs" → You select "lunge"
✅ GOOD: User says "knee pain going DOWN stairs" → You select:
  - step down (eccentric quad control)
  - short arc quad (quad activation without stress)
  - quad stretch (reduce tension)
  - glute bridge (hip strength for knee support)

Elbow Pain:
❌ BAD: User says "outside elbow pain when gripping" → You select random arm exercises
✅ GOOD: User says "outside elbow pain when gripping" → You select:
  - band wrist extension (target lateral epicondyle)
  - wrist extensor stretch (reduce tension)
  - wrist circles (mobility)

THE RULE:
Ask yourself: "Does this exercise directly address the SPECIFIC movement pattern or muscle group causing their pain?"
If no → Don't select it
If yes → Include it

PROTOCOL SIZE:
- 4-6 exercises maximum
- At least 1 stretch for the affected area
- Mix of strengthening and mobility
- Start simple, progressable
```

---

### Solution 3: Build In-Protocol AI Assistant

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
1. Ask where it hurts (sharp vs dull, location, etc.)
2. Suggest 1-2 alternative exercises from the SAME body part
3. Explain why the alternative might work better
4. Use the exact exercise names from the approved list

Example:
User: "The bridge exercise hurts my lower back"
You: "Where in your lower back - more towards the sides or center?"
User: "Center, feels like strain"
You: "That suggests you might be overarching. Let's try 'pelvic tilt' instead - it teaches the same hip movement but with less back stress. Sound good?"

PROGRESS UPDATES:
- Celebrate milestones (Day 7 of 14! Halfway there!)
- Ask about pain changes (Is the pain better, same, or worse?)
- Remind them of frequency (Do this daily for best results)

APPROVED EXERCISES FOR SUBSTITUTION:
[Use the same 120-exercise list from the main protocol generation]

Lower Back & Core: pelvic tilt, cat cow stretch, bird dog, dead bug, bridge, glute bridge, plank, side plank, child's pose, cobra stretch, prone press up, seated spinal twist, supine twist, pelvic clock, abdominal bracing

Hips & Glutes: clamshell, fire hydrant, side lying leg raise, seated piriformis stretch, figure 4 stretch, hip flexor stretch, IT band stretch, 90-90 hip stretch, frog stretch, groin stretch, butterfly stretch, monster walk (band), lateral band walk (band)

Legs & Knees: wall sit, step up, step down, mini squat, lunge, reverse lunge, side lunge, straight leg raise, short arc quad, quad set, heel slide, sit to stand

Ankles & Feet: ankle circles, calf raise, single leg calf raise, wall calf stretch, standing calf stretch, single leg balance, toe raises, heel walks

Shoulders & Upper Back: shoulder rolls, arm circles, wall angel, pendulum exercise, scapular squeeze, upper back stretch, thoracic rotation, band pull apart (band), band row (band), band reverse fly (band), band external rotation (band), band internal rotation (band)

Neck: neck rotation, neck side bend, chin tuck

Arms & Wrists: wrist circles, wrist flexor stretch, wrist extensor stretch, tricep stretch, band wrist curl (band), band wrist extension (band)

RESPONSE FORMAT:
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
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    if (data.userId !== request.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'User ID does not match.');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    try {
      const exerciseContext = `Current exercises: ${data.currentExercises.map(e => e.name).join(', ')}`;

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
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0].message.content || '';

      // Parse JSON response
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
        console.warn('Failed to parse JSON:', e);
      }

      return { message: aiResponse };
    } catch (error: any) {
      console.error('Error in protocol assistant:', error);
      throw new functions.https.HttpsError('internal', 'Failed to process request', error.message);
    }
  }
);
```

**Export in `functions/src/index.ts`:**
```javascript
export { protocolAssistant } from './protocolAssistant';
```

---

## 📋 Implementation Checklist

- [ ] **Solution 1A:** Add equipment question to SYSTEM_PROMPT
- [ ] **Solution 1B:** Replace APPROVED EXERCISES with new 120-exercise list
- [ ] **Solution 1C:** Add programmatic equipment validation
- [ ] **Solution 2:** Add exercise specificity rules to SYSTEM_PROMPT
- [ ] **Solution 3:** Create protocolAssistant.ts and export it
- [ ] **Testing:** Test protocol generation with "bodyweight only" user
- [ ] **Testing:** Test protocol generation with "I have bands" user
- [ ] **Testing:** Verify validation catches invalid exercise names
- [ ] **Testing:** Test in-protocol assistant for exercise substitutions

---

## 🧪 Testing Scenarios

### Test Case 1: Bodyweight Only User
```
Input: User complains about lower back pain, says "Bodyweight only"
Expected: Protocol contains only bodyweight exercises (pelvic tilt, bird dog, dead bug, bridge, child's pose)
Should NOT contain: band pallof press, band wood chop
```

### Test Case 2: User With Bands
```
Input: User complains about shoulder pain, says "I have bands"
Expected: Protocol can contain band exercises (band external rotation, band reverse fly, band pull apart)
```

### Test Case 3: Invalid Exercise Detection
```
Input: AI somehow returns "cable row" (not in approved list)
Expected: HttpsError thrown, protocol rejected, AI forced to regenerate
```

### Test Case 4: Specificity Check
```
Input: User says "outside elbow pain when gripping" (lateral epicondylitis)
Expected: Protocol focuses on wrist extensors (band wrist extension, wrist extensor stretch, wrist circles)
Should NOT contain: Generic arm exercises unrelated to the specific complaint
```

### Test Case 5: In-Protocol Substitution
```
Input: User in active protocol says "The bridge exercise hurts my back"
Expected: AI suggests "pelvic tilt" or "dead bug" as alternatives
AI explains why (less back stress)
Does NOT regenerate entire protocol
```

---

## 📊 Success Metrics

After implementation, track:

1. **Exercise Validity Rate:** % of protocols with 100% valid exercises
   - Target: 100%

2. **Equipment Match Rate:** % of protocols respecting user's equipment preference
   - Target: 100%

3. **Specificity Score:** Manual review - do exercises match user's complaint?
   - Target: >80% relevant

4. **User Completion Rate:** % of users who complete assigned exercises
   - Baseline: TBD, measure improvement

5. **Substitution Request Rate:** % of users requesting exercise swaps
   - Target: <20% (indicates good initial assignment)

---

## 🚀 Key Improvements from v1 Spec

### **Simpler Implementation:**
- ✅ No complex deduplication logic needed (we removed all duplicates)
- ✅ Cleaner exercise names (no more "flexion leg sit up (bent knee)")
- ✅ Only 120 exercises to list in prompt (vs 333)
- ✅ Clear body part categories

### **Maintained from v1:**
- ✅ Equipment question flow (still critical)
- ✅ Programmatic validation (still needed)
- ✅ Specificity emphasis (still important)
- ✅ In-protocol assistant (still missing)

### **Removed from v1:**
- ❌ No need for deduplication logic
- ❌ No need for exercise family groupings
- ❌ No need for complex name simplification
- ❌ No need to handle ExerciseDB quirks

---

## 💡 Additional Notes

- The 120-exercise list uses **standard PT terminology** - AI should understand these easily
- All exercises have clear `primaryUse` field in JSON - AI can reference this
- No more obscure variations ("three bench dip", "band horizontal pallof press")
- Equipment split is clean: ~85 bodyweight, ~35 band exercises
- Much easier to maintain and update going forward

---

## 📞 Questions for Implementation

1. Should we add the `primaryUse` field to the AI prompt for context?
2. Do we want the AI to explain WHY it chose specific exercises in the protocol summary?
3. Should we limit protocols to specific body regions (e.g., can't mix lower back + shoulder)?
4. For the in-protocol assistant, should it be able to ADD exercises or only substitute?

---

## 🔗 Related Files

- `functions/src/index.ts` - Main protocol generation logic
- `functions/src/rehab-exercises.json` - Clean 120-exercise list (NEW)
- `functions/src/protocolAssistant.ts` - To be created
- `scripts/youtube-research.js` - Will work with new exercise names

---

**Ready for implementation!** Much simpler than the original spec.
