# Recoverly - Technical Game Plan

## Project Overview

**Goal:** Mobile-first wellness app that uses AI to provide on-the-fly guidance for minor movement issues, delivering simple exercise recommendations and tracking recovery progress.

**Approach:** AI-generated protocols with strong guardrails (not pre-built templates). General wellness guidance, not clinical rehabilitation.

**Monetization:** Paywall after AI intake conversation. Monthly ($9.99) or Annual ($79.99) subscription to access protocols and tracking features.

**Timeline:** 6-8 weeks for MVP launch

---

## Tech Stack

### Frontend
- **React Native** (with Expo for faster development)
  - Expo Router for navigation
  - React Native Paper or NativeBase for UI components
  - React Query for data fetching/caching
  - Zustand or Context API for state management

### Backend
- **Firebase**
  - Firestore (NoSQL database)
  - Firebase Authentication (email/password + OAuth)
  - Cloud Functions (serverless API endpoints)
  - Firebase Storage (future: user uploads, exports)

### Third-Party Services
- **OpenAI API** (GPT-4o or GPT-4o-mini)
  - Intake conversation
  - On-the-fly protocol generation
  - Exercise recommendations
  - Structured JSON output

- **ExerciseDB API** (RapidAPI) - Optional for MVP
  - Exercise library (~1,300 exercises)
  - GIF demonstrations (animated, auto-play)
  - Basic text instructions
  - Searchable by name, body part, equipment
  - Free tier: 10,000 requests/month

- **YouTube Data API v3** (Optional for MVP)
  - Exercise video search
  - Embed PT/fitness channel videos
  - Potential for marketing partnerships
  - Free tier: 10,000 quota units/day (~10k searches)

- **Stripe** (via Firebase Extensions or custom integration)
  - Subscription management
  - Monthly/annual billing
  - Payment processing

### Development Tools
- TypeScript (type safety)
- ESLint + Prettier (code quality)
- Jest + React Native Testing Library (testing)

---

## Architecture

```
┌──────────────────────────┐
│   React Native App       │
│   (Expo)                 │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌──────────────┐
│Firebase │      │  Cloud       │
│         │      │  Functions   │
│- Auth   │      └──────┬───────┘
│- Store  │             │
│- Storage│      ┌──────┴─────────────┐
└─────────┘      │                    │
                 ▼                    ▼
            ┌─────────┐      ┌────────────────┐
            │ OpenAI  │      │  ExerciseDB    │
            │   API   │      │  (optional)    │
            │         │      │                │
            │(Generates)     │  OR            │
            │Protocol │      │                │
            │On-the-fly)     │  YouTube API   │
            └─────────┘      │  (optional)    │
                             └────────────────┘
```

---

## Data Models (Firestore Collections)

### `users`
```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;
  displayName: string;
  subscriptionStatus: 'free' | 'active' | 'cancelled' | 'expired';
  subscriptionTier: 'monthly' | 'annual' | null;
  stripeCustomerId: string;
  subscriptionEndDate: Timestamp;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### `conditions`
```typescript
{
  id: string;
  userId: string;
  status: 'active' | 'resolved' | 'paused';

  // AI Classification Output
  bodyRegion: string;           // 'left_knee', 'lower_back', etc.
  primaryLimitation: string;    // 'mobility', 'strength', 'stability'
  symptomType: string;          // 'dull_ache', 'sharp_pain', 'stiffness'
  severity: 'mild' | 'moderate' | 'severe';
  redFlags: string[];           // ['numbness', 'trauma', etc.]

  // User Input
  initialDescription: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
  }>;

  // Metadata
  createdAt: Timestamp;
  resolvedAt?: Timestamp;

  // Linked plan
  activePlanId?: string;
}
```

### `rehabPlans`
```typescript
{
  id: string;
  conditionId: string;
  userId: string;

  // AI-Generated Protocol Info
  protocolName: string;         // AI-generated title
  description: string;          // Brief explanation

  startDate: Timestamp;
  targetDurationWeeks: number;  // 2 weeks typical for MVP
  currentWeek: number;          // 1-indexed
  frequency: string;            // "3-4 times per week"

  exercises: Array<{
    id: string;
    name: string;
    description: string;        // How to perform
    sets: number;
    reps: string;               // "10-15" or "30 seconds"
    notes: string;              // "Move slowly, breathe deeply"

    // Visual aids (optional for MVP)
    exerciseDbId?: string;      // Link to ExerciseDB
    exerciseDbGifUrl?: string;  // Cached GIF URL
    youtubeVideoId?: string;    // YouTube video ID
    youtubeChannelName?: string;// For attribution/partnerships

    order: number;              // Display order
  }>;

  // Safety & Guidance
  safetyNotes: string[];
  progressionNotes: string;     // When to progress/stop
  disclaimer: string;           // Legal disclaimer

  // Adaptation tracking
  lastAdaptationDate?: Timestamp;
  adaptationHistory: Array<{
    date: Timestamp;
    action: 'progressed' | 'maintained' | 'regressed' | 'modified';
    reason: string;
    aiRecommendation?: string;
  }>;

  status: 'active' | 'completed' | 'abandoned';
  createdAt: Timestamp;
}
```

### `sessionLogs`
```typescript
{
  id: string;
  userId: string;
  planId: string;
  conditionId: string;

  completedAt: Timestamp;

  prePainScore: number;         // 0-10
  postPainScore: number;        // 0-10

  exercisesCompleted: string[]; // Array of exercise IDs from plan
  notes?: string;               // Optional user notes

  sessionNumber: number;        // 1, 2, 3...
  weekNumber: number;           // 1, 2, 3...
}
```

---

## Core User Flows

### Flow 1: New User Onboarding + Intake

```
1. User opens app → Sign up/Login screen
   - Email/password or Google/Apple OAuth

2. Welcome screen
   - "Describe your pain or movement issue"
   - Free text area (placeholder: "E.g., 'My lower back is stiff in the mornings'")

3. Submit → AI conversation begins (chat interface)
   - Cloud Function calls OpenAI API
   - AI asks 2-4 clarifying questions conversationally
   - "How long have you had this stiffness?"
   - "Does it get better or worse throughout the day?"
   - "Have you had any recent injuries?"
   - User responds in chat

4. AI generates protocol summary
   - Single API call generates full protocol on-the-fly
   - "Based on your description, here's what I recommend:"
   - Shows exercise names (preview only)
   - "4 simple stretches, 3-4x per week, 2 weeks"

5. PAYWALL SCREEN (or RED FLAG WARNING if severe)
   - "Unlock Your Personalized Recovery Plan"
   - Monthly: $9.99/month
   - Annual: $79.99/year (Save 33%)
   - CTA: "Start Recovery" → Stripe checkout

6. After payment → Create condition + plan
   - Firestore writes: condition doc, rehabPlan doc (with AI-generated exercises)
   - Optionally fetch GIFs from ExerciseDB or YouTube videos
   - Navigate to Dashboard
```

**Red Flag Handling:**
- If AI detects: severe pain, numbness, trauma, or other red flags:
  - Show warning screen BEFORE paywall
  - "⚠️ Based on your symptoms, we strongly recommend consulting a healthcare professional"
  - Provide option to exit or acknowledge and continue
  - Log red flag events for review

---

### Flow 2: Dashboard (Home Screen)

```
┌─────────────────────────────┐
│  Active Conditions          │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │ LEFT KNEE PAIN      │   │
│  │ Day 5 of 14         │   │
│  │ ⭐⭐⭐ 3 sessions   │   │
│  │ Pain: 6 → 4 ↓       │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ LOWER BACK TIGHTNESS│   │
│  │ Day 2 of 14         │   │
│  │ ⭐ 1 session        │   │
│  │ Pain: 5 → 5 →       │   │
│  └─────────────────────┘   │
│                             │
│  [+ Add New Condition]      │
└─────────────────────────────┘
```

**Tap card → Condition Detail View**

---

### Flow 3: Condition Detail + Session Tracking

```
Condition Detail Screen:
- Header: "LEFT KNEE PAIN"
- Pain trend chart (line graph, past 2 weeks)
- "Start Today's Session" button (primary CTA)

When user taps "Start Today's Session":

1. Pre-Session Pain Rating
   - "Rate your pain right now (0-10)"
   - Slider: 0 (No pain) → 10 (Worst pain)

2. Exercise List
   - Exercise 1: Cat-Cow Stretch
     - GIF demonstration (auto-plays)
     - "10 reps, 2 sets"
     - "Move slowly, focus on spinal mobility"
     - [✓ Mark Complete] button

   - Exercise 2: Pelvic Tilt
     - (same format)

   - ... (5-7 exercises total)

3. Post-Session Pain Rating
   - "Rate your pain now (0-10)"
   - Slider: 0 → 10

4. Optional Notes
   - "How did this session feel?" (text area)

5. Submit
   - Create sessionLog document
   - Update condition stats
   - Show completion animation
   - Return to Dashboard
```

---

### Flow 4: Weekly Adaptation (Background Logic)

```
Cloud Function runs weekly (Firebase Scheduled Functions):

For each active plan:
  1. Fetch last 7 days of sessionLogs

  2. Calculate metrics:
     - Average pre-pain score
     - Average post-pain score
     - Pain trend (improving/stable/worsening)
     - Adherence rate (sessions completed / expected)

  3. Adaptation logic:
     IF pain improved by 2+ points:
       → Increase reps by 20% OR add 1 set
       → Log: "Progressed volume - pain improving"

     ELSE IF pain stable (within 1 point):
       → Swap 1-2 exercises for variations
       → Log: "Swapped exercises - plateau detected"

     ELSE IF pain worsening:
       → Decrease volume OR flag for user review
       → Push notification: "Let's adjust your plan"

  4. Update rehabPlan document

  5. Send push notification (if changes made)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Setup:**
- [x] Initialize React Native project with Expo
- [ ] Configure TypeScript + ESLint
- [ ] Set up Firebase project
  - [ ] Enable Authentication (email/password, Google)
  - [ ] Create Firestore database
  - [ ] Set up security rules
  - [ ] Deploy basic Cloud Functions structure
- [ ] Install dependencies (React Query, navigation, UI library)

**Core Auth:**
- [ ] Build login/signup screens
- [ ] Implement Firebase Auth integration
- [ ] Protected route logic (redirect if not subscribed)

---

### Phase 2: AI Intake Flow (Week 3-4)

**Cloud Functions:**
- [ ] `/api/generateRecoveryPlan` (POST)
  - Input: user description + conversation history
  - Single OpenAI API call with comprehensive system prompt
  - AI generates full protocol on-the-fly (exercises, sets/reps, safety notes)
  - Returns: complete protocol object with red flag detection

**System Prompt Requirements:**
- [ ] Define conservative exercise guidelines (bodyweight only, basic movements)
- [ ] Set red flag detection rules (severe pain, numbness, trauma)
- [ ] Specify output format (4-6 exercises, 2 sets, 10-15 reps)
- [ ] Include mandatory disclaimers in every response
- [ ] Bias toward "refer out" when uncertain

**Frontend:**
- [ ] Intake screen (free text input + chat UI)
- [ ] Chat interface (Q&A with AI, ChatGPT-style minimal design)
- [ ] Protocol preview screen (shows exercise names before paywall)
- [ ] Red flag warning screen (conditional, blocks payment if detected)

**Optional Exercise Visuals (can defer to post-MVP):**
- [ ] ExerciseDB integration (GIFs for common exercises)
- [ ] YouTube API integration (embed PT channel videos)
- [ ] Create exercise visual matching service

---

### Phase 3: Payment Integration (Week 4-5)

**Stripe Setup:**
- [ ] Create Stripe account
- [ ] Set up products:
  - Monthly subscription ($9.99)
  - Annual subscription ($79.99)
- [ ] Install Firebase Extension: "Run Payments with Stripe"
  - OR custom Cloud Functions if more control needed

**Frontend:**
- [ ] Paywall screen UI
- [ ] Stripe Checkout integration
- [ ] Subscription status checking (middleware)
- [ ] Handle successful payment → create condition + plan

**Backend:**
- [ ] Stripe webhook handlers (subscription created/cancelled/expired)
- [ ] Update user.subscriptionStatus in Firestore

---

### Phase 4: Dashboard + Tracking (Week 5-7)

**Dashboard:**
- [ ] Active conditions list view
- [ ] Condition card component
  - Display: name, days completed, adherence, pain trend
- [ ] Pull-to-refresh
- [ ] "Add New Condition" flow (re-uses intake)

**Condition Detail:**
- [ ] Pain trend chart (Victory Native or react-native-chart-kit)
- [ ] Session history list
- [ ] "Start Session" button (primary CTA)

**Session Tracking:**
- [ ] Pre-pain rating screen
- [ ] Exercise list with GIFs
- [ ] Mark exercise complete (checkboxes)
- [ ] Post-pain rating screen
- [ ] Optional notes field
- [ ] Submit session → create sessionLog

**Progress Visualization:**
- [ ] Line chart: pain scores over time
- [ ] Session completion calendar/heatmap
- [ ] Adherence percentage badge

---

### Phase 5: Adaptation + Notifications (Week 7-8)

**Adaptation Logic:**
- [ ] Cloud Function: `weeklyAdaptation` (scheduled)
- [ ] Query sessionLogs for past 7 days per plan
- [ ] Calculate pain trends
- [ ] Update rehabPlan exercises based on rules
- [ ] Log adaptations in `adaptationHistory`

**Push Notifications:**
- [ ] Set up Firebase Cloud Messaging
- [ ] Request notification permissions in app
- [ ] Send reminders:
  - Daily: "Time for your session" (if not completed today)
  - Weekly: "Plan updated based on your progress"
- [ ] Cloud Function: `sendReminders` (scheduled daily)

**Red Flag Monitoring:**
- [ ] If user reports pain increase of 3+ points for 2 consecutive sessions:
  - Push notification: "Your pain seems to be increasing. Consider consulting a professional."
  - In-app banner with same message

---

### Phase 6: Polish + Testing (Week 8-10)

**UI/UX:**
- [ ] Onboarding tutorial/walkthrough (first launch)
- [ ] Loading states + skeleton screens
- [ ] Error handling (network errors, API failures)
- [ ] Empty states (no active conditions, no sessions yet)
- [ ] Confirmation dialogs (e.g., "Mark condition as resolved?")

**Safety + Legal:**
- [ ] Disclaimer screens (multiple touchpoints):
  - On signup
  - Before starting first session
  - In settings/about
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] "Consult a professional" prompt if pain worsens
- [ ] Export session data (GDPR compliance)

**Testing:**
- [ ] Unit tests for Cloud Functions
- [ ] Integration tests for payment flow
- [ ] E2E tests for critical paths (intake → payment → session)
- [ ] Manual testing on iOS + Android devices
- [ ] Beta testing with 10-20 users

**App Store Prep:**
- [ ] App icon + splash screen
- [ ] Screenshots for App Store/Play Store
- [ ] Marketing copy
- [ ] Privacy nutrition labels (Apple)
- [ ] Submit for review

---

## API Integration Details

### OpenAI API (GPT-4o or GPT-4o-mini)

**Cloud Function: generateRecoveryPlan**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateRecoveryPlan = async (userInput: string, history: Message[]) => {
  const systemPrompt = `
You are Recoverly AI, a wellness guidance assistant for minor movement issues.

CRITICAL RULES:
1. Only provide guidance for MILD, NON-ACUTE issues
2. Recommend 4-6 BASIC stretches/mobility exercises only
3. Keep it SIMPLE - bodyweight only, no equipment
4. If user describes severe pain (8+/10), trauma, numbness, or persistent issues → SET shouldReferOut: true
5. Always include: "This is general wellness guidance, not medical advice"
6. Use basic exercises: cat-cow, glute bridges, band pull-aparts, dead bugs, child's pose, etc.
7. Sets/reps should be conservative: 2 sets, 10-15 reps, 3-4x per week
8. Duration: 2 weeks to start, then reassess

RED FLAGS (auto-refer to professional):
- Severe pain (8-10/10)
- Numbness, tingling, weakness
- Recent trauma or injury
- Pain after accident/fall
- Fever with pain
- Bowel/bladder changes
- Progressive worsening

RESPONSE FORMAT (JSON):
{
  "condition": "brief description",
  "severity": "mild" | "moderate" | "refer",
  "shouldReferOut": boolean,
  "referralReason": "string if referring out",
  "protocol": {
    "name": "descriptive name",
    "exercises": [
      {
        "name": "Cat-Cow Stretch",
        "description": "brief how-to",
        "sets": 2,
        "reps": "10-12",
        "notes": "Move slowly, focus on breathing",
        "searchTerm": "cat cow stretch" // for finding videos/GIFs
      }
    ],
    "frequency": "3-4 times per week",
    "duration": "2 weeks",
    "progressionNotes": "If pain improves, continue. If no change or worse after 2 weeks, consult a professional."
  },
  "safetyNotes": ["specific warnings"],
  "disclaimer": "This is general wellness guidance, not medical advice..."
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Or 'gpt-4o' for better quality
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userInput }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
};
```

**Cost Estimate:**
- **GPT-4o-mini:**
  - Input: ~800 tokens (system + conversation) = $0.00012
  - Output: ~600 tokens (full protocol) = $0.00018
  - **Total per protocol: ~$0.0003 (very cheap)**

- **GPT-4o (if higher quality needed):**
  - Input: ~800 tokens = $0.004
  - Output: ~600 tokens = $0.015
  - **Total per protocol: ~$0.019 (still cheap)**

**For 1,000 users:**
- GPT-4o-mini: $0.30
- GPT-4o: $19


---

### Exercise Visual Options (ExerciseDB + YouTube)

**Option 1: ExerciseDB API (RapidAPI) - Pros & Cons**

**What ExerciseDB Provides:**
- 1,300+ exercises with animated GIFs
- Basic text instructions
- Searchable by name, body part, equipment
- GIFs auto-play in app (good UX)
- Free tier: 10,000 requests/month

**Pros:**
- Simple integration
- Consistent visual quality
- Fast loading (GIFs are small)
- No attribution required

**Cons:**
- Limited library (may not match all AI-generated exercises)
- Generic GIFs (not narrated/explained)
- No marketing partnership potential
- Some exercises may not exist

**Implementation:**
```typescript
import axios from 'axios';

export const searchExerciseByName = async (exerciseName: string) => {
  // Search for closest match
  const response = await axios.get(
    `https://exercisedb.p.rapidapi.com/exercises/name/${exerciseName}`,
    {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    }
  );

  return response.data[0]; // Return best match
};
```

---

**Option 2: YouTube API - Pros & Cons**

**What YouTube API Provides:**
- Search for exercise videos by keyword
- Embed videos in-app
- Access to professional PT channels (Bob & Brad, Athlean-X, etc.)
- Video metadata (title, channel, duration)
- Free tier: 10,000 quota units/day (~10k searches)

**Pros:**
- High-quality instructional content
- Professional PT explanations
- Marketing partnership opportunities (affiliate links, sponsored channels)
- Massive library (covers everything)
- Better user experience (full explanations)

**Cons:**
- Videos require user interaction (tap to play)
- Slower than GIFs (need WiFi)
- Attribution required (channel names)
- More complex integration

**Implementation:**
```typescript
import axios from 'axios';

export const searchYouTubeVideo = async (exerciseName: string) => {
  const response = await axios.get(
    'https://www.googleapis.com/youtube/v3/search',
    {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        q: `${exerciseName} physical therapy tutorial`,
        part: 'snippet',
        type: 'video',
        maxResults: 1,
        videoDuration: 'short', // < 4 minutes
        relevanceLanguage: 'en'
      }
    }
  );

  return {
    videoId: response.data.items[0].id.videoId,
    title: response.data.items[0].snippet.title,
    channelName: response.data.items[0].snippet.channelTitle,
    thumbnail: response.data.items[0].snippet.thumbnails.high.url
  };
};
```

---

**Recommended Hybrid Approach:**

```typescript
export const getExerciseVisual = async (exerciseName: string) => {
  // Try ExerciseDB first (fast, simple)
  try {
    const exerciseDbResult = await searchExerciseByName(exerciseName);
    if (exerciseDbResult) {
      return {
        type: 'gif',
        url: exerciseDbResult.gifUrl,
        source: 'exercisedb'
      };
    }
  } catch (error) {
    console.warn('ExerciseDB search failed, falling back to YouTube');
  }

  // Fallback to YouTube (better coverage)
  const youtubeResult = await searchYouTubeVideo(exerciseName);
  return {
    type: 'video',
    videoId: youtubeResult.videoId,
    thumbnail: youtubeResult.thumbnail,
    channelName: youtubeResult.channelName,
    source: 'youtube'
  };
};
```

**UX Considerations:**
- Show GIF if available (auto-plays, seamless)
- Show YouTube thumbnail + "Watch Tutorial" button if no GIF
- Cache results in Firestore to avoid repeated API calls
- Allow users to toggle between visual types in settings

**Marketing Opportunity:**
- Partner with PT YouTubers (e.g., "Recommended by Bob & Brad")
- Affiliate links to their paid programs
- Co-marketing opportunities

---

## Security Considerations

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    match /conditions/{conditionId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    match /rehabPlans/{planId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write
    }

    match /sessionLogs/{logId} {
      allow read, create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    // Exercise visuals cache (optional, for ExerciseDB/YouTube results)
    match /exerciseVisuals/{visualId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can cache
    }
  }
}
```

---

## Safety & Legal Requirements

### Disclaimers (Required Screens)

**1. First Launch:**
```
⚠️ IMPORTANT NOTICE

Recoverly provides general exercise guidance only.

This app:
- Does NOT diagnose medical conditions
- Does NOT replace professional medical advice
- Is NOT a medical device

If you experience:
- Severe pain (8-10/10)
- Numbness or tingling
- Symptoms that worsen
- Pain lasting more than 2 weeks

→ STOP and consult a licensed healthcare provider.

By continuing, you acknowledge this disclaimer.

[I Understand] [Cancel]
```

**2. Before First Session:**
```
Safety Check

Before starting exercises:
☐ I have not been advised against exercise by a doctor
☐ I understand this is general guidance, not medical advice
☐ I will stop if pain increases during exercises
☐ I accept responsibility for my use of this app

[Start Session] [Go Back]
```

**3. In-App (Settings/About):**
- Link to full Terms of Service
- Link to Privacy Policy
- "Consult a Professional" button (links to local PT finder)

---

## Monetization Details

### Pricing Strategy

**Monthly:** $9.99/month
- Billed monthly via Stripe
- Cancel anytime
- Target: Users trying app short-term

**Annual:** $79.99/year ($6.67/month equivalent)
- 33% savings vs monthly
- Billed once per year
- Target: Committed users, better LTV

**Free Tier:**
- Intake conversation only
- No access to protocols or tracking
- Used for conversion (try before you buy)

### Revenue Projections (Conservative)

**Assumptions:**
- 1,000 monthly active users after 6 months
- 30% conversion rate (free → paid)
- 70% choose monthly, 30% choose annual

**Monthly Revenue:**
- 300 paid users
- 210 monthly × $9.99 = $2,098
- 90 annual × $79.99 ÷ 12 = $600
- **Total: ~$2,700/month**

**Annual Revenue Year 1:** ~$32,000

(Excludes marketing costs, Stripe fees 2.9%, infrastructure ~$200/month)

---

## MVP Success Metrics

### Key Metrics to Track

**Acquisition:**
- App installs
- Signup completion rate
- Source attribution (if running ads)

**Activation:**
- % of users who complete intake conversation
- Time to first conversation completion
- Average questions asked by AI

**Monetization:**
- Free → Paid conversion rate (target: 25-30%)
- Monthly vs Annual selection
- Churn rate (target: <10% monthly)

**Engagement:**
- Session completion rate (target: 50%+ in first week)
- Sessions per week (target: 3+ for 30% of users)
- Return engagement Day 4+ (target: 60%)

**Retention:**
- Day 7 retention
- Day 30 retention
- Weekly active users (WAU)

**Health Outcomes (self-reported):**
- Average pain score reduction (target: 2+ points over 2 weeks)
- % of users marking condition as "resolved"
- Time to resolution (average days)

---

## Risk Mitigation

### Technical Risks

**1. AI Generates Unsafe Recommendations**
- **Risk:** AI recommends inappropriate or dangerous exercises
- **Mitigation:**
  - Strict system prompt with conservative guidelines
  - Only basic bodyweight exercises allowed in prompt
  - Red flag detection built into AI response
  - Human review of AI logs (spot check 10% of protocols weekly)
  - Allow user to "report issue" with protocol
  - Monitor for patterns of concerning recommendations

**2. Exercise Visual APIs Unavailable**
- **Risk:** ExerciseDB or YouTube API down/rate limited
- **Mitigation:**
  - Cache all visual results in Firestore after first fetch
  - Hybrid approach: fallback from ExerciseDB → YouTube → text only
  - Graceful degradation: show text instructions if no visuals available
  - Consider storing top 100 common exercise GIFs directly in Firebase Storage

**3. OpenAI API Costs or Outages**
- **Risk:** Unexpected cost spikes or API downtime
- **Mitigation:**
  - Set hard usage limits in OpenAI dashboard ($100/day max)
  - Rate limit per user (max 3 protocol generations per day)
  - Monitor costs daily via OpenAI dashboard
  - Cache conversation context to minimize token usage
  - Fallback message if API is down: "Service temporarily unavailable"

### Legal/Liability Risks

**4. User Injury**
- **Risk:** User hurts themselves following app guidance
- **Mitigation:**
  - Multiple disclaimer screens (documented consent)
  - Conservative protocols (low-risk stretches/mobility)
  - Red flag detection (escalate severe cases)
  - General liability insurance ($1M+ coverage recommended)
  - Consult healthcare attorney before launch

**5. Medical Device Regulation (FDA)**
- **Risk:** App classified as medical device
- **Mitigation:**
  - Explicitly NOT diagnosing or treating
  - Provide "general wellness" guidance only
  - Language: "exercise recommendations" not "treatment"
  - Consult regulatory expert if scaling

### Business Risks

**6. Low Conversion Rate**
- **Risk:** Users don't pay after intake
- **Mitigation:**
  - A/B test pricing ($4.99, $9.99, $14.99)
  - Offer 7-day free trial
  - Show sample protocol preview before paywall
  - Social proof (testimonials, success stories)

**7. High Churn**
- **Risk:** Users cancel after 1 month
- **Mitigation:**
  - Weekly adaptation keeps content fresh
  - Push notifications for re-engagement
  - Gamification (streaks, badges)
  - In-app survey for churned users (gather feedback)

---

## Next Steps

### Immediate Actions (This Week)

1. **Project Setup** ✅ DONE
   - Initialize React Native project
   - Set up Firebase project
   - Configure development environment

2. **AI System Prompt Development**
   - Craft comprehensive OpenAI system prompt with guardrails
   - Define red flag detection rules
   - Test with sample user inputs
   - Refine exercise recommendation guidelines

3. **Legal Prep**
   - Draft Terms of Service + Privacy Policy (use templates)
   - Research general liability insurance providers
   - (Optional) Schedule consultation with healthcare attorney

4. **Design/Wireframes** (in progress)
   - Finalize key screens (intake chat, dashboard, session tracking)
   - Define visual style (minimalist, ChatGPT-inspired)
   - Color scheme already established (green primary)

### Week-by-Week Milestones (Updated for AI-Generated Approach)

- **Week 1-2:** ✅ Foundation complete (auth, Firebase, project structure)
- **Week 2-3:** AI intake chat + protocol generation Cloud Function
- **Week 3-4:** Payment integration (Stripe)
- **Week 4-5:** Dashboard + session tracking UI
- **Week 5-6:** Adaptation logic + push notifications
- **Week 6-7:** Exercise visuals (ExerciseDB/YouTube integration)
- **Week 7-8:** Polish + testing + beta launch

**New Timeline:** 6-8 weeks (reduced from 8-10 weeks)

---

## Questions to Resolve Before Building

- [ ] Have you consulted a healthcare attorney about liability?
- [ ] Do you have general liability insurance or plan to get it?
- [ ] What are your monthly/annual pricing numbers final or flexible for A/B testing?
- [ ] Do you want iOS first, Android first, or simultaneous launch?
- [ ] Do you have design preferences (minimalist, colorful, medical/clinical feel)?
- [ ] Are you comfortable with Firebase Cloud Functions (Node.js/TypeScript) or need alternatives?

---

## Resources & References

### Development
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [ExerciseDB API](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb)

### Legal/Safety
- [FDA Guidance on Medical Apps](https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/index.html) (not required for general wellness, but good reference)

### Design Inspiration
- MyFitnessPal (session tracking)
- Headspace (onboarding + subscription flow)
- Calm (minimalist health UI)
- PT Pal / Physitrack (rehab-specific apps)

---

**Last Updated:** 2025-10-28

**Version:** 2.0 (Updated for AI-Generated Protocols)

**Status:** In Active Development

**Key Changes in v2.0:**
- Shifted from template-based to AI-generated protocols
- Simplified architecture (removed protocol template system)
- Added exercise visual options (ExerciseDB + YouTube hybrid)
- Reduced MVP timeline from 8-10 weeks to 6-8 weeks
- Updated data models for AI-generated content
- Added marketing partnership opportunities (YouTube PT channels)

