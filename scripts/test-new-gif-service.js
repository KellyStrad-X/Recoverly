#!/usr/bin/env node
/**
 * Test script for new GIF service implementation
 * Tests fuzzy matching and GIF fetching with base64 conversion
 */

const Fuse = require('fuse.js');
const { Buffer } = require('buffer');
const exerciseDatabase = require('./exercisedb-complete-index.json');

require('dotenv').config();

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const EXERCISEDB_BASE_URL = 'https://exercisedb.p.rapidapi.com';

// Initialize Fuse.js
const fuse = new Fuse(exerciseDatabase, {
  keys: ['name'],
  threshold: 0.4,
  includeScore: true,
});

/**
 * Find exercise in database using fuzzy matching
 */
function findExerciseByName(exerciseName) {
  console.log('🔍 Searching exercise database for:', exerciseName);

  const results = fuse.search(exerciseName);

  if (results.length === 0) {
    console.warn('⚠️ No exercises found in database');
    return null;
  }

  const bestMatch = results[0];
  console.log(`✅ Found match: "${bestMatch.item.name}" (ID: ${bestMatch.item.id}, score: ${bestMatch.score.toFixed(2)})`);

  return {
    id: bestMatch.item.id,
    name: bestMatch.item.name,
  };
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  return Buffer.from(bytes).toString('base64');
}

/**
 * Fetch GIF from ExerciseDB /image endpoint
 */
async function fetchExerciseGif(exerciseId) {
  if (!RAPIDAPI_KEY) {
    console.error('❌ RapidAPI key not configured');
    console.error('   Make sure EXPO_PUBLIC_RAPIDAPI_KEY is set in .env');
    return null;
  }

  try {
    const url = `${EXERCISEDB_BASE_URL}/image?exerciseId=${exerciseId}&resolution=1080`;
    console.log('🎬 Fetching GIF from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch GIF:', response.status, response.statusText);
      return null;
    }

    // Fetch as blob, then convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    // Return as data URI
    const dataUri = `data:image/gif;base64,${base64}`;
    console.log(`✅ GIF fetched successfully (${(base64.length / 1024).toFixed(1)} KB)`);
    console.log(`📊 Base64 preview: ${base64.substring(0, 50)}...`);

    return dataUri;
  } catch (error) {
    console.error('❌ Error fetching GIF:', error);
    return null;
  }
}

/**
 * Test the complete flow
 */
async function testGifService() {
  console.log('\n🧪 ========== TESTING GIF SERVICE ==========\n');

  // Test exercises
  const testExercises = [
    'Hip Bridges',
    'bridge',
    'glute bridge',
    'Squats',
  ];

  for (const exerciseName of testExercises) {
    console.log(`\n📝 Testing: "${exerciseName}"`);
    console.log('─'.repeat(50));

    // Find exercise
    const exercise = findExerciseByName(exerciseName);

    if (!exercise) {
      console.log('❌ No match found\n');
      continue;
    }

    // Fetch GIF
    const gifUrl = await fetchExerciseGif(exercise.id);

    if (gifUrl) {
      console.log('✅ SUCCESS: GIF data URI generated');
      console.log(`   Length: ${gifUrl.length} characters`);
    } else {
      console.log('❌ FAILED: Could not fetch GIF');
    }

    console.log('');
  }

  console.log('🏁 ========== TEST COMPLETE ==========\n');
}

// Run tests
testGifService().catch(console.error);
