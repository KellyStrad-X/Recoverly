# Exercise List Integration Plan

## Problem

Currently, the AI can generate ANY exercise name, leading to poor GIF matching:
- AI says: "Hip Bridges"
- Fuzzy match finds: "barbell glute bridge" (requires equipment!)
- Result: Wrong GIF shown to user

## Root Cause

The AI prompt (functions/src/index.ts lines 212-218) says:
```
EXERCISE GUIDELINES:
- ONLY bodyweight exercises (no equipment required)
- Basic, safe movements...
```

But it doesn't tell the AI **which specific exercises exist** in ExerciseDB.

## Solution

Constrain the AI to ONLY use exercises from our curated rehab list.

### Files Created

1. **`scripts/rehab-exercise-list.json`** - 333 bodyweight/band exercises safe for rehab
2. **`scripts/rehab-exercises-for-ai.json`** - Simplified version for AI prompt

### What Changed

**Before (AI makes up exercises):**
- AI generates: "Hip Bridges"
- We fuzzy match → get wrong exercise
- Bad UX

**After (AI uses exact names):**
- AI uses: "pelvic tilt into bridge" (ID: 1422)
- We lookup by exact name → get correct exercise ID
- Perfect GIF match!

---

## Implementation Steps

### Step 1: Copy Exercise List to Functions Directory

The Cloud Function needs access to the exercise list:

```bash
# Copy the curated list to functions directory
cp scripts/rehab-exercises-for-ai.json functions/src/rehab-exercises.json
```

### Step 2: Update Firebase Function Prompt

File: `functions/src/index.ts`

**Find (lines 212-218):**
```typescript
EXERCISE GUIDELINES:
- ONLY bodyweight exercises (no equipment required)
- Basic, safe movements (stretches, controlled movements, basic strength)
- 4-6 exercises maximum
- 2 sets, 10-15 reps (or time-based for stretches)
- Progressive approach (start gentle)
- Clear safety notes for each exercise
```

**Replace with:**
```typescript
EXERCISE SELECTION RULES (CRITICAL):
- You MUST use exercise names from this approved list ONLY
- DO NOT make up exercise names or modify the names below
- Select 4-6 exercises appropriate for the user's condition
- Choose by body part (e.g., "upper legs" for knee pain)

APPROVED EXERCISES BY BODY PART:

Upper Legs (for knee, hip rehab):
- pelvic tilt into bridge
- low glute bridge on floor
- glute bridge march
- side hip abduction
- band single leg split squat
- balance board
- lying (side) quads stretch
- hamstring stretch
- seated glute stretch
- twist hip lift

Waist (for core, lower back rehab):
- pelvic tilt
- dead bug
- bird dog
- side bridge v. 2
- front plank with twist
- curl-up
- bridge - mountain climber (cross body)
- seated side crunch (wall)
- reverse crunch
- spine twist

Back (for back pain, posture):
- hyperextension
- hyperextension (on bench)
- sphinx
- spine stretch
- upward facing dog
- kneeling lat stretch
- seated lower back stretch
- upper back stretch
- inverted row (if able)
- band straight leg deadlift

Lower Legs (for ankle, calf rehab):
- ankle circles
- bodyweight standing calf raise
- calf stretch with hands against wall
- standing calves calf stretch
- seated calf stretch (male)
- donkey calf raise

Shoulders (for shoulder rehab):
- band shoulder press
- band front raise
- band y-raise
- band reverse fly
- rear deltoid stretch
- band standing rear delt row

Chest (for shoulder/chest mobility):
- push-up (wall)
- push-up (wall) v. 2
- incline push-up
- chest and front of shoulder stretch
- dynamic chest stretch (male)
- push-up (if able)

IMPORTANT:
- Use EXACT names from list above - do not modify or create variations
- These exercises have GIFs available in our database
- 2 sets, 10-15 reps (or 30-60 seconds for stretches)
- Start with easier progressions (wall push-ups before regular push-ups)
- Include safety notes for each exercise
```

### Step 3: Update Exercise Media Service (Matching Logic)

File: `src/services/exerciseMediaService.ts`

**Current approach:** Fuzzy matching with threshold 0.4

**New approach:** Exact name lookup (no fuzzy matching needed!)

Replace the `findExerciseByName` function (lines 69-86):

```typescript
/**
 * Find exercise in database using exact name match
 * AI now uses exact names from our curated list, so no fuzzy matching needed
 */
const findExerciseByName = (exerciseName: string): { id: string; name: string } | null => {
  console.log('🔍 Looking up exercise in database:', exerciseName);

  // Exact match (case-insensitive)
  const match = exerciseDatabase.find(
    ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
  );

  if (!match) {
    console.warn('⚠️ Exercise not found in database:', exerciseName);
    console.warn('   This should not happen if AI is using the approved list!');
    return null;
  }

  console.log(`✅ Found exact match: "${match.name}" (ID: ${match.id})`);

  return {
    id: match.id,
    name: match.name,
  };
};
```

**Why this works:**
- AI uses exact name: "pelvic tilt into bridge"
- We lookup: `exerciseDatabase.find(ex => ex.name === "pelvic tilt into bridge")`
- Returns: `{ id: "1422", name: "pelvic tilt into bridge" }`
- Fetch GIF: `/image?exerciseId=1422`
- Perfect match, every time!

### Step 4: Deploy and Test

```bash
# Deploy Firebase function
cd functions
npm run deploy

# Or if you need to build first:
npm run build
firebase deploy --only functions

# Test in app
cd ..
npm start
```

---

## Testing the Fix

1. **Start a new plan:**
   - User: "I have knee pain"
   - AI should generate protocol with exercises like:
     - "pelvic tilt into bridge" ✅
     - "low glute bridge on floor" ✅
     - "side hip abduction" ✅

2. **Check console logs:**
   ```
   🔍 Looking up exercise in database: pelvic tilt into bridge
   ✅ Found exact match: "pelvic tilt into bridge" (ID: 1422)
   🎬 Fetching GIF from: ...image?exerciseId=1422&resolution=1080
   ✅ GIF fetched successfully
   ```

3. **Verify GIFs match:**
   - Expand exercise accordion
   - GIF should show the EXACT exercise mentioned
   - No more "barbell" exercises when user has no equipment!

---

## Benefits of This Approach

✅ **Perfect Matching** - AI uses exact names → No fuzzy matching errors

✅ **Rehab-Appropriate** - All exercises are pre-vetted for bodyweight/bands

✅ **Consistent UX** - Every plan will have GIFs that actually match

✅ **Scalable** - Easy to add more exercises to the approved list

✅ **No Breaking Changes** - Same API structure, just better data

---

## Alternative: Dynamic List (More Complex)

Instead of hardcoding exercises in the prompt, you could:

1. Load `rehab-exercises.json` in the Cloud Function
2. Inject the list dynamically into the prompt
3. Allows easy updates without re-deploying

```typescript
import rehabExercises from './rehab-exercises.json';

// Build exercise list from JSON
const exerciseList = Object.entries(rehabExercises.byBodyPart)
  .map(([bodyPart, exercises]) => {
    const exerciseNames = exercises.slice(0, 10).map(ex => `- ${ex.name}`).join('\n');
    return `${bodyPart.toUpperCase()} (${exercises.length} total):\n${exerciseNames}`;
  })
  .join('\n\n');

const SYSTEM_PROMPT = `...
APPROVED EXERCISES BY BODY PART:
${exerciseList}
...`;
```

This is more elegant but adds complexity. Start with the hardcoded list, optimize later if needed.

---

## Questions to Consider

1. **Should we show all 333 exercises to the AI?**
   - Pro: More options, better variety
   - Con: Longer prompt, higher costs, harder for AI to choose
   - Recommendation: Start with ~50-60 most common rehab exercises (as shown in Step 2)

2. **Should we allow fuzzy matching as fallback?**
   - Pro: Handles typos/variations
   - Con: Could match wrong exercises again
   - Recommendation: NO - if AI uses wrong name, it should fail loudly so we can fix the prompt

3. **Should we validate exercise names in the Cloud Function?**
   - Pro: Catches errors before sending to user
   - Con: Extra validation logic
   - Recommendation: YES - simple check:
     ```typescript
     // Before returning protocol
     const invalidExercises = protocol.exercises.filter(ex =>
       !approvedExerciseNames.includes(ex.name)
     );

     if (invalidExercises.length > 0) {
       console.error('AI generated invalid exercises:', invalidExercises);
       // Either reject or substitute with approved alternatives
     }
     ```

---

## Next Steps

1. Review the exercise list in Step 2 - does it cover common rehab needs?
2. Decide: hardcoded list vs dynamic JSON loading
3. Update the Cloud Function prompt
4. Update the matching logic (remove fuzzy search)
5. Deploy and test
6. Monitor for any AI "hallucinations" (making up exercises)

---

**Ready to implement?** I can make these changes now if you'd like!
