/**
 * Upload YouTube Research Results to Firestore
 *
 * This script takes the youtube-research-results.json file
 * and uploads it to Firestore's exerciseVideoCache collection.
 *
 * Prerequisites:
 * 1. Run youtube-research.js first to generate results
 * 2. Review the CSV to ensure video quality
 * 3. Have Firebase Admin SDK credentials configured
 *
 * Usage:
 *   node youtube-upload-to-firestore.js [options]
 *
 * Options:
 *   --dry-run         Show what would be uploaded without actually uploading
 *   --min-score N     Only upload videos with score >= N (default: 50)
 *   --force           Overwrite existing cache entries
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MIN_SCORE = args.includes('--min-score')
  ? parseInt(args[args.indexOf('--min-score') + 1])
  : 50;
const FORCE = args.includes('--force');

// Initialize Firebase Admin
try {
  const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: firebase-service-account.json not found');
    console.error('Please download your Firebase service account key and place it in the project root');
    console.error('See: https://firebase.google.com/docs/admin/setup#initialize-sdk');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Cache configuration (24 hours per YouTube ToS)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// Generate cache key from exercise name (same logic as frontend)
function getCacheKey(exerciseName) {
  return exerciseName.toLowerCase().trim().replace(/\s+/g, '_');
}

async function uploadToFirestore(results) {
  console.log('📤 Uploading YouTube video cache to Firestore\n');
  console.log(`Configuration:`);
  console.log(`  Dry run: ${DRY_RUN ? 'YES (no changes will be made)' : 'NO'}`);
  console.log(`  Min score: ${MIN_SCORE}`);
  console.log(`  Force overwrite: ${FORCE ? 'YES' : 'NO'}`);
  console.log(`  Total results: ${results.length}\n`);

  // Filter by score
  const filtered = results.filter(r => r.score >= MIN_SCORE);
  console.log(`Videos meeting score threshold: ${filtered.length}\n`);

  if (filtered.length === 0) {
    console.log('⚠️  No videos meet the minimum score requirement');
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of filtered) {
    const cacheKey = getCacheKey(result.exerciseName);
    const cacheRef = db.collection('exerciseVideoCache').doc(cacheKey);

    try {
      // Check if already exists (unless force mode)
      if (!FORCE && !DRY_RUN) {
        const existing = await cacheRef.get();
        if (existing.exists) {
          console.log(`⏭️  Skipping ${result.exerciseName} (already cached)`);
          skipped++;
          continue;
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

      const cacheData = {
        exerciseId: cacheKey,
        exerciseName: result.exerciseName,
        videoId: result.videoId,
        videoTitle: result.title,
        cachedAt: admin.firestore.Timestamp.fromDate(now),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        // Extra metadata for tracking
        metadata: {
          durationSeconds: result.durationSeconds,
          score: result.score,
          strategy: result.strategy,
          channelTitle: result.channelTitle,
          researchedAt: now.toISOString()
        }
      };

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would upload: ${result.exerciseName} -> ${result.videoId} (${result.durationFormatted}, score: ${result.score})`);
      } else {
        await cacheRef.set(cacheData);
        console.log(`✅ Uploaded: ${result.exerciseName} -> ${result.videoId} (${result.durationFormatted}, score: ${result.score})`);
      }

      uploaded++;

    } catch (error) {
      console.error(`❌ Error uploading ${result.exerciseName}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (DRY_RUN) {
    console.log(`\n💡 This was a dry run. Run without --dry-run to actually upload.`);
  } else {
    console.log(`\n✅ Upload complete!`);
  }
}

async function main() {
  console.log('🎬 YouTube Cache Upload Tool\n');

  // Load results
  const resultsPath = path.join(__dirname, '../youtube-research-results.json');

  if (!fs.existsSync(resultsPath)) {
    console.error('❌ ERROR: youtube-research-results.json not found');
    console.error('Please run youtube-research.js first to generate results');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  console.log(`📚 Loaded ${results.length} research results\n`);

  await uploadToFirestore(results);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
