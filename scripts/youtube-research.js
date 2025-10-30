/**
 * YouTube Exercise Video Research Script
 *
 * This script automatically searches YouTube for all 333 exercises
 * and finds the best video match for each one.
 *
 * Features:
 * - Tests multiple search strategies per exercise
 * - Evaluates video duration (targets 1-2 min videos)
 * - Scores videos based on relevance criteria
 * - Outputs detailed CSV report
 * - Optionally pre-populates Firestore cache
 *
 * Usage:
 *   node youtube-research.js [options]
 *
 * Options:
 *   --sample N          Test on N random exercises (default: all 333)
 *   --upload            Upload results to Firestore cache
 *   --verbose           Show detailed logging
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Parse command line arguments
const args = process.argv.slice(2);
const SAMPLE_SIZE = args.includes('--sample')
  ? parseInt(args[args.indexOf('--sample') + 1])
  : null;
const UPLOAD_TO_FIRESTORE = args.includes('--upload');
const VERBOSE = args.includes('--verbose');

// Search strategies to test (ordered by priority)
const SEARCH_STRATEGIES = [
  {
    name: '30-second-demo',
    buildQuery: (exercise) => `"${exercise}" 30 second demonstration physical therapy`,
    params: {
      videoDuration: 'short',
      videoDefinition: 'high',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
    }
  },
  {
    name: '1-minute-tutorial',
    buildQuery: (exercise) => `"${exercise}" 1 minute how to physical therapy`,
    params: {
      videoDuration: 'short',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
    }
  },
  {
    name: 'quick-technique',
    buildQuery: (exercise) => `"${exercise}" quick technique -routine -workout`,
    params: {
      videoDuration: 'short',
      videoDefinition: 'high',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
    }
  },
  {
    name: 'exact-phrase-demo',
    buildQuery: (exercise) => `"${exercise}" physical therapy demonstration`,
    params: {
      videoDuration: 'short',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
    }
  },
  {
    name: 'basic-tutorial',
    buildQuery: (exercise) => `${exercise} exercise tutorial`,
    params: {
      videoDuration: 'short',
      videoEmbeddable: 'true',
    }
  }
];

// Parse ISO 8601 duration (e.g., "PT1M30S" -> 90 seconds)
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

// Score a video based on relevance criteria
function scoreVideo(video, exerciseName, durationSeconds) {
  let score = 0;
  const title = video.snippet.title.toLowerCase();
  const exerciseLower = exerciseName.toLowerCase();

  // Title contains exact exercise name (50 points)
  if (title.includes(exerciseLower)) {
    score += 50;
  }

  // Title contains "physical therapy" or "PT" (20 points)
  if (title.includes('physical therapy') || title.includes(' pt ') || title.includes('physio')) {
    score += 20;
  }

  // Title contains "how to" or "tutorial" (10 points)
  if (title.includes('how to') || title.includes('tutorial') || title.includes('demonstration')) {
    score += 10;
  }

  // Duration scoring (30 points max)
  // Ideal: 30-120 seconds (1-2 minutes)
  if (durationSeconds >= 30 && durationSeconds <= 120) {
    score += 30; // Perfect duration
  } else if (durationSeconds >= 20 && durationSeconds <= 180) {
    score += 20; // Good duration
  } else if (durationSeconds >= 10 && durationSeconds <= 240) {
    score += 10; // Acceptable duration
  }
  // Too short (< 10s) or too long (> 4min) gets 0 points

  // Channel indicators (bonus points)
  const channelName = video.snippet.channelTitle.toLowerCase();
  if (channelName.includes('dr') || channelName.includes('physical therapy') ||
      channelName.includes('physio') || channelName.includes('rehab')) {
    score += 10;
  }

  return score;
}

// Search YouTube with a specific strategy
async function searchWithStrategy(exerciseName, strategy) {
  try {
    const query = strategy.buildQuery(exerciseName);
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '3', // Get top 3 to have alternatives
      key: YOUTUBE_API_KEY,
      ...strategy.params
    });

    const searchUrl = `${YOUTUBE_BASE_URL}/search?${params}`;

    if (VERBOSE) {
      console.log(`  Testing strategy: ${strategy.name}`);
      console.log(`  Query: ${query}`);
    }

    const response = await fetch(searchUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`  ❌ API error for strategy ${strategy.name}:`, errorData?.error?.message);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      if (VERBOSE) console.log(`  No results for strategy: ${strategy.name}`);
      return null;
    }

    // Get video details (duration, etc.)
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const detailsParams = new URLSearchParams({
      part: 'contentDetails,statistics',
      id: videoIds,
      key: YOUTUBE_API_KEY
    });

    const detailsUrl = `${YOUTUBE_BASE_URL}/videos?${detailsParams}`;
    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      console.error(`  ❌ Failed to fetch video details for strategy ${strategy.name}`);
      return null;
    }

    const detailsData = await detailsResponse.json();

    // Score each video
    const scoredVideos = data.items.map((item, index) => {
      const details = detailsData.items[index];
      const durationSeconds = parseISO8601Duration(details.contentDetails.duration);
      const score = scoreVideo(item, exerciseName, durationSeconds);

      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        durationSeconds,
        durationFormatted: `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`,
        viewCount: details.statistics.viewCount,
        score,
        strategy: strategy.name
      };
    });

    // Return best scoring video from this strategy
    scoredVideos.sort((a, b) => b.score - a.score);
    return scoredVideos[0];

  } catch (error) {
    console.error(`  ❌ Error with strategy ${strategy.name}:`, error.message);
    return null;
  }
}

// Research best video for a single exercise
async function researchExercise(exerciseName, bodyPart, equipment) {
  console.log(`\n📹 Researching: ${exerciseName} (${bodyPart}, ${equipment})`);

  const results = [];

  // Try each strategy until we find a good match
  for (const strategy of SEARCH_STRATEGIES) {
    const result = await searchWithStrategy(exerciseName, strategy);

    if (result) {
      results.push(result);

      // If we found a high-scoring video (>= 70), stop searching
      if (result.score >= 70) {
        console.log(`  ✅ Found excellent match with ${strategy.name}: ${result.title}`);
        console.log(`     Score: ${result.score}/100 | Duration: ${result.durationFormatted} | Channel: ${result.channelTitle}`);
        break;
      }
    }

    // Rate limiting: wait 100ms between API calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (results.length === 0) {
    console.log(`  ⚠️  No videos found for: ${exerciseName}`);
    return null;
  }

  // Return best result
  const bestResult = results.sort((a, b) => b.score - a.score)[0];

  if (bestResult.score < 70) {
    console.log(`  ⚠️  Best match has low score (${bestResult.score}/100): ${bestResult.title}`);
  }

  return {
    exerciseName,
    bodyPart,
    equipment,
    ...bestResult
  };
}

// Main execution
async function main() {
  console.log('🎬 YouTube Exercise Video Research Tool\n');

  // Check API key
  if (!YOUTUBE_API_KEY) {
    console.error('❌ ERROR: EXPO_PUBLIC_YOUTUBE_API_KEY not found in environment');
    console.error('Please ensure your .env file is properly configured');
    process.exit(1);
  }

  console.log('✅ YouTube API key found');

  // Load exercises
  const exercisesPath = path.join(__dirname, '../functions/src/rehab-exercises.json');
  const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));
  let exercises = exercisesData.exercises;

  console.log(`📚 Loaded ${exercises.length} exercises`);

  // Sample if requested
  if (SAMPLE_SIZE) {
    exercises = exercises.sort(() => Math.random() - 0.5).slice(0, SAMPLE_SIZE);
    console.log(`🎲 Testing on ${SAMPLE_SIZE} random exercises\n`);
  } else {
    console.log(`🎯 Researching all ${exercises.length} exercises\n`);
  }

  const results = [];
  const startTime = Date.now();

  // Process each exercise
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    console.log(`[${i + 1}/${exercises.length}]`);

    const result = await researchExercise(
      exercise.name,
      exercise.bodyPart,
      exercise.equipment
    );

    if (result) {
      results.push(result);
    }

    // Rate limiting: wait 200ms between exercises
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const elapsedTime = Math.round((Date.now() - startTime) / 1000);

  // Generate report
  console.log(`\n\n📊 RESEARCH COMPLETE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total exercises researched: ${exercises.length}`);
  console.log(`Videos found: ${results.length}`);
  console.log(`No match found: ${exercises.length - results.length}`);
  console.log(`Time elapsed: ${elapsedTime}s`);
  console.log(`Average: ${(elapsedTime / exercises.length).toFixed(1)}s per exercise`);

  // Score distribution
  const scoreRanges = {
    'Excellent (80-100)': results.filter(r => r.score >= 80).length,
    'Good (60-79)': results.filter(r => r.score >= 60 && r.score < 80).length,
    'Fair (40-59)': results.filter(r => r.score >= 40 && r.score < 60).length,
    'Poor (0-39)': results.filter(r => r.score < 40).length,
  };

  console.log(`\n📈 Score Distribution:`);
  Object.entries(scoreRanges).forEach(([range, count]) => {
    const percentage = ((count / results.length) * 100).toFixed(1);
    console.log(`  ${range}: ${count} (${percentage}%)`);
  });

  // Duration distribution
  const durationRanges = {
    'Under 30s': results.filter(r => r.durationSeconds < 30).length,
    '30s - 1min': results.filter(r => r.durationSeconds >= 30 && r.durationSeconds < 60).length,
    '1-2 min ⭐': results.filter(r => r.durationSeconds >= 60 && r.durationSeconds < 120).length,
    '2-3 min': results.filter(r => r.durationSeconds >= 120 && r.durationSeconds < 180).length,
    '3-4 min': results.filter(r => r.durationSeconds >= 180 && r.durationSeconds < 240).length,
    'Over 4 min': results.filter(r => r.durationSeconds >= 240).length,
  };

  console.log(`\n⏱️  Duration Distribution:`);
  Object.entries(durationRanges).forEach(([range, count]) => {
    const percentage = ((count / results.length) * 100).toFixed(1);
    console.log(`  ${range}: ${count} (${percentage}%)`);
  });

  // Save results to CSV
  const csvPath = path.join(__dirname, '../youtube-research-results.csv');
  const csvHeaders = [
    'Exercise Name',
    'Body Part',
    'Equipment',
    'Video ID',
    'Video Title',
    'Channel',
    'Duration',
    'Duration (seconds)',
    'Views',
    'Score',
    'Strategy Used',
    'YouTube URL'
  ];

  const csvRows = results.map(r => [
    r.exerciseName,
    r.bodyPart,
    r.equipment,
    r.videoId,
    `"${r.title.replace(/"/g, '""')}"`, // Escape quotes in title
    `"${r.channelTitle.replace(/"/g, '""')}"`,
    r.durationFormatted,
    r.durationSeconds,
    r.viewCount,
    r.score,
    r.strategy,
    `https://youtube.com/watch?v=${r.videoId}`
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n💾 Results saved to: ${csvPath}`);

  // Save results to JSON for programmatic use
  const jsonPath = path.join(__dirname, '../youtube-research-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`💾 Results saved to: ${jsonPath}`);

  // Flag problematic exercises
  const lowScoreExercises = results.filter(r => r.score < 50);
  if (lowScoreExercises.length > 0) {
    console.log(`\n⚠️  Low-scoring videos (< 50) that may need manual review:`);
    lowScoreExercises.forEach(r => {
      console.log(`  • ${r.exerciseName} (Score: ${r.score}) - ${r.title}`);
    });
  }

  const longVideos = results.filter(r => r.durationSeconds > 180);
  if (longVideos.length > 0) {
    console.log(`\n⚠️  Videos over 3 minutes (may be too long):`);
    longVideos.forEach(r => {
      console.log(`  • ${r.exerciseName} (${r.durationFormatted}) - ${r.title}`);
    });
  }

  // Upload to Firestore if requested
  if (UPLOAD_TO_FIRESTORE) {
    console.log(`\n📤 Uploading to Firestore...`);
    console.log(`⚠️  This feature requires Firebase Admin SDK setup`);
    console.log(`   Run 'node youtube-upload-to-firestore.js' separately after reviewing results`);
  }

  console.log(`\n✅ Research complete!\n`);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
