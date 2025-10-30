# YouTube Exercise Video Research Scripts

Automated tools for researching and curating YouTube videos for all 333 Recoverly exercises.

---

## 📋 Overview

These scripts help you:

1. **Research** - Automatically search YouTube for all exercises using optimized strategies
2. **Evaluate** - Score videos based on duration, relevance, and professional quality
3. **Curate** - Review results in CSV format and identify problematic matches
4. **Deploy** - Pre-populate Firestore cache with approved videos

---

## 🚀 Quick Start

### Prerequisites

```bash
# Make sure you're in the scripts directory
cd /home/kelly/Desktop/Recoverly/scripts

# Install dependencies (if not already installed)
npm install dotenv firebase-admin

# Ensure your .env file has the YouTube API key
# Located at: ../recoverly-app/.env
# Should contain: EXPO_PUBLIC_YOUTUBE_API_KEY=your_key_here
```

### Step 1: Run Research (Test Sample)

Start with a small sample to verify everything works:

```bash
node youtube-research.js --sample 10 --verbose
```

**Output:**
- Console progress for each exercise
- `youtube-research-results.csv` - Human-readable results
- `youtube-research-results.json` - Machine-readable results

### Step 2: Review Results

Open `youtube-research-results.csv` in Excel/Sheets and review:
- ✅ Videos with score ≥ 70 are excellent
- ⚠️  Videos with score < 50 may need manual review
- ⏱️  Check durations - ideally 30s-2min

### Step 3: Run Full Research

Once satisfied with sample results:

```bash
node youtube-research.js
```

**This will:**
- Research all 333 exercises
- Take ~20-30 minutes (with rate limiting)
- Use ~1,500 YouTube API quota units (you have 10,000/day)

### Step 4: Upload to Firestore (Optional)

After reviewing results, upload to production:

```bash
# Dry run first (shows what would be uploaded)
node youtube-upload-to-firestore.js --dry-run --min-score 60

# Actually upload (only videos with score >= 60)
node youtube-upload-to-firestore.js --min-score 60
```

---

## 📚 Script Documentation

### `youtube-research.js`

Searches YouTube for exercises using multiple strategies.

**Command Line Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `--sample N` | Test on N random exercises | `--sample 20` |
| `--verbose` | Show detailed logging | `--verbose` |
| `--upload` | (Placeholder) Upload to Firestore | `--upload` |

**Search Strategies (tried in order):**

1. **30-second-demo** - `"exercise name" 30 second demonstration physical therapy`
   - Targets ultra-short professional demos
   - Filters: short duration, HD, embeddable

2. **1-minute-tutorial** - `"exercise name" 1 minute how to physical therapy`
   - Targets quick tutorials
   - Filters: short duration, embeddable

3. **quick-technique** - `"exercise name" quick technique -routine -workout`
   - Exact phrase + exclusions to avoid compilations
   - Filters: short duration, HD, embeddable

4. **exact-phrase-demo** - `"exercise name" physical therapy demonstration`
   - Professional PT demos
   - Filters: short duration, embeddable

5. **basic-tutorial** - `exercise name exercise tutorial`
   - Fallback with broad terms
   - Filters: short duration, embeddable

**Scoring System (0-100):**

| Criteria | Points | Description |
|----------|--------|-------------|
| Title match | 50 | Exercise name appears in video title |
| PT keywords | 20 | "physical therapy", "PT", "physio" in title |
| Tutorial keywords | 10 | "how to", "tutorial", "demonstration" in title |
| Duration (30-120s) | 30 | Ideal length for quick demos |
| Duration (20-180s) | 20 | Good length |
| Duration (10-240s) | 10 | Acceptable length |
| Professional channel | 10 | Channel name contains PT indicators |

**Output Files:**

- `youtube-research-results.csv` - Spreadsheet with all results
- `youtube-research-results.json` - JSON for programmatic use

**Example Output:**

```
📹 Researching: dead bug (waist, body weight)
  ✅ Found excellent match with 30-second-demo: Dead Bug Exercise | 30 Second Demo
     Score: 90/100 | Duration: 0:45 | Channel: Dr. Jo - Physical Therapy

📊 RESEARCH COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total exercises researched: 333
Videos found: 328
No match found: 5
Time elapsed: 1245s
Average: 3.7s per exercise

📈 Score Distribution:
  Excellent (80-100): 156 (47.6%)
  Good (60-79): 98 (29.9%)
  Fair (40-59): 54 (16.5%)
  Poor (0-39): 20 (6.1%)

⏱️  Duration Distribution:
  Under 30s: 45 (13.7%)
  30s - 1min: 89 (27.1%)
  1-2 min ⭐: 142 (43.3%)
  2-3 min: 38 (11.6%)
  3-4 min: 11 (3.4%)
  Over 4 min: 3 (0.9%)
```

---

### `youtube-upload-to-firestore.js`

Uploads research results to Firestore cache.

**Prerequisites:**

1. **Firebase Service Account Key**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Save as `firebase-service-account.json` in project root
   - See: https://firebase.google.com/docs/admin/setup#initialize-sdk

2. **Research Results**
   - Must run `youtube-research.js` first
   - Generates `youtube-research-results.json`

**Command Line Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Show what would be uploaded (no changes) | `--dry-run` |
| `--min-score N` | Only upload videos with score ≥ N | `--min-score 70` |
| `--force` | Overwrite existing cache entries | `--force` |

**Example Usage:**

```bash
# Preview what would be uploaded (score >= 60)
node youtube-upload-to-firestore.js --dry-run --min-score 60

# Upload only excellent videos (score >= 80)
node youtube-upload-to-firestore.js --min-score 80

# Upload all videos, overwriting existing cache
node youtube-upload-to-firestore.js --min-score 0 --force
```

**Cache Structure:**

Each video is stored in Firestore with 24-hour TTL:

```javascript
{
  exerciseId: "dead_bug",           // Normalized exercise name
  exerciseName: "dead bug",          // Original name
  videoId: "abc123xyz",              // YouTube video ID
  videoTitle: "Dead Bug Exercise | 30 Second Demo",
  cachedAt: Timestamp,               // When cached
  expiresAt: Timestamp,              // 24 hours later
  metadata: {
    durationSeconds: 45,
    score: 90,
    strategy: "30-second-demo",
    channelTitle: "Dr. Jo - Physical Therapy",
    researchedAt: "2025-10-30T..."
  }
}
```

---

## 📊 Interpreting Results

### CSV Columns Explained

| Column | Description |
|--------|-------------|
| Exercise Name | Name from rehab-exercises.json |
| Body Part | Muscle group (waist, upper legs, etc.) |
| Equipment | body weight, band, etc. |
| Video ID | YouTube video identifier |
| Video Title | Full title of the video |
| Channel | Creator's channel name |
| Duration | Human-readable (e.g., "1:30") |
| Duration (seconds) | For filtering/sorting |
| Views | View count (popularity indicator) |
| Score | Relevance score (0-100) |
| Strategy Used | Which search strategy found it |
| YouTube URL | Direct link to video |

### Quality Indicators

**Excellent Videos (Score ≥ 80):**
- Exercise name in title ✅
- Professional PT channel ✅
- 30s-2min duration ✅
- Clear tutorial focus ✅

**Action Required (Score < 50):**
- May not match exercise exactly
- Could be too long or too short
- Might need manual replacement

**Duration Concerns:**
- < 20s: Probably too short to be useful
- \> 3min: May be too long for quick reference
- 30s-2min: **Ideal sweet spot** ⭐

### Common Issues

**No video found:**
- Exercise name might be uncommon
- Try manual YouTube search
- Consider alternative exercise names

**Low score but looks good:**
- Some exercises have unusual names
- Review video manually before rejecting
- Score is a guideline, not absolute

**Multiple strategies tested:**
- Earlier strategies are more specific
- Later strategies are broader fallbacks
- Check which strategy was used

---

## 🔧 Troubleshooting

### YouTube API Errors

**403 Forbidden:**
```
❌ API error: The request cannot be completed because you have exceeded your quota.
```

**Solution:** You've hit the 10,000 daily quota limit. Wait until next day or enable billing in Google Cloud Console.

**401 Unauthorized:**
```
❌ API error: API key not valid.
```

**Solution:** Check your `.env` file has the correct `EXPO_PUBLIC_YOUTUBE_API_KEY`.

### Firestore Errors

**Permission Denied:**
```
❌ Failed to initialize Firebase Admin: Error: Invalid service account
```

**Solution:** Download fresh service account key from Firebase Console.

**Missing Collection:**
```
⚠️  Skipping exercise (already cached)
```

This is normal - it means the video is already in Firestore. Use `--force` to overwrite.

### Rate Limiting

Scripts include built-in rate limiting:
- 100ms between API calls within a strategy
- 200ms between exercises

If you hit rate limits, the script will show errors but continue.

---

## 💡 Pro Tips

### 1. Test Before Full Run

Always test with `--sample 10` first to verify:
- API key works
- Results look good
- No unexpected errors

### 2. Review CSV in Spreadsheet

Sort by:
- **Score** (ascending) - find low-quality matches
- **Duration** (descending) - find overly long videos
- **Body Part** - review by category

### 3. Manual Curation Workflow

1. Run research script
2. Export CSV to Google Sheets
3. Add "Approved" column
4. Review videos manually (click YouTube URLs)
5. Mark approved videos
6. Filter CSV to only approved
7. Upload approved subset

### 4. Incremental Updates

To update specific exercises:

```bash
# Edit the script to filter specific exercises
# Or manually delete cache entries in Firestore
# Then re-run research for those exercises
```

### 5. Monitor API Quota

Check usage at: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

Each search costs:
- Search API call: ~100 quota units
- Video details call: ~1 quota unit
- Average per exercise: ~101 quota units

333 exercises × 101 = ~33,633 quota units (but strategies may find match early)

---

## 📈 Optimization Ideas

### For Better Results

1. **Add channel whitelist** - Search within specific PT channels first
2. **Video age filter** - Prefer recent videos (last 2-3 years)
3. **A/B test queries** - Try variations and compare scores
4. **User feedback loop** - Track which videos users skip/like

### For Faster Execution

1. **Parallel processing** - Search multiple exercises concurrently
2. **Cache strategy results** - Don't re-test working strategies
3. **Early termination** - Stop at first 90+ score

### For Cost Reduction

1. **Reuse search results** - Cache for 7 days, not 24 hours
2. **Manual curation** - Only search for new exercises
3. **Batch video details** - Fetch up to 50 at once

---

## 🤝 Contributing

Found a better search strategy? Improved the scoring algorithm?

1. Test on sample exercises first
2. Document results in comments
3. Share findings with the team

---

## 📞 Support

Questions? Check:
- YouTube Data API docs: https://developers.google.com/youtube/v3
- Firebase Admin SDK docs: https://firebase.google.com/docs/admin/setup

---

## 📝 License

Internal tool for Recoverly. Not for public distribution.
