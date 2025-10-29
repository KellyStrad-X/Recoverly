/**
 * Fetch ALL ExerciseDB exercises using pagination
 * Run: node scripts/fetch-all-exercises-paginated.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

async function fetchWithPagination(endpoint, offsetParam = 'offset', limitParam = 'limit') {
  console.log(`\n📡 Fetching paginated: ${endpoint}`);

  let allExercises = [];
  let offset = 0;
  const limit = 100; // Try fetching 100 at a time
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}${endpoint}?${limitParam}=${limit}&${offsetParam}=${offset}`;
    console.log(`  📥 Fetching offset ${offset}...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        console.log(`  ⚠️  Status ${response.status} - trying without pagination params...`);
        break;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`  ✅ Reached end (no more results)`);
        hasMore = false;
        break;
      }

      console.log(`  ✅ Got ${data.length} exercises`);
      allExercises = allExercises.concat(data);

      // If we got fewer than limit, we're done
      if (data.length < limit) {
        console.log(`  ✅ Reached end (partial page)`);
        hasMore = false;
      } else {
        offset += limit;
      }

      // Safety: stop after 2000 exercises
      if (allExercises.length >= 2000) {
        console.log(`  ⚠️  Safety limit reached (2000 exercises)`);
        hasMore = false;
      }

    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      hasMore = false;
    }
  }

  return allExercises;
}

async function fetchAllBodyParts() {
  console.log('\n🔍 STRATEGY: Fetch by body part and combine');
  console.log('='.repeat(50));

  // First get all body parts
  const bodyPartsResponse = await fetch(`${BASE_URL}/exercises/bodyPartList`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    },
  });

  const bodyParts = await bodyPartsResponse.json();
  console.log('📊 Body parts:', bodyParts);

  let allExercises = [];
  const seenIds = new Set();

  // Fetch exercises for each body part
  for (const bodyPart of bodyParts) {
    console.log(`\n📍 Fetching: ${bodyPart}`);

    try {
      const response = await fetch(`${BASE_URL}/exercises/bodyPart/${encodeURIComponent(bodyPart)}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });

      const exercises = await response.json();
      console.log(`  ✅ Got ${exercises.length} exercises for ${bodyPart}`);

      // Check first exercise structure
      if (exercises.length > 0) {
        console.log(`  📋 Sample exercise:`, JSON.stringify(exercises[0], null, 2).substring(0, 300));
      }

      // Add unique exercises
      for (const ex of exercises) {
        if (!seenIds.has(ex.id)) {
          seenIds.add(ex.id);
          allExercises.push(ex);
        }
      }

    } catch (error) {
      console.error(`  ❌ Error fetching ${bodyPart}:`, error.message);
    }
  }

  return allExercises;
}

async function main() {
  console.log('🎬 FETCHING COMPLETE EXERCISEDB DATABASE');
  console.log('='.repeat(50));

  if (!RAPIDAPI_KEY) {
    console.error('❌ EXPO_PUBLIC_RAPIDAPI_KEY not found');
    process.exit(1);
  }

  console.log('✅ API Key loaded\n');

  // Try Strategy 1: Pagination
  console.log('\n🔄 STRATEGY 1: Try pagination with offset/limit');
  console.log('='.repeat(50));
  let exercises = await fetchWithPagination('/exercises');

  // If pagination didn't work, try by body part
  if (exercises.length === 0 || exercises.length <= 10) {
    console.log('\n⚠️  Pagination returned limited results, trying body part approach...');
    exercises = await fetchAllBodyParts();
  }

  console.log('\n\n📊 FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Total exercises fetched: ${exercises.length}`);

  if (exercises.length > 0) {
    // Save to file
    const outputPath = path.join(__dirname, 'exercisedb-complete.json');
    fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
    console.log(`💾 Saved to: ${outputPath}`);

    // Create index
    const index = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      bodyPart: ex.bodyPart,
      target: ex.target,
      equipment: ex.equipment,
      gifUrl: ex.gifUrl,
    }));

    const indexPath = path.join(__dirname, 'exercisedb-complete-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`📇 Index saved to: ${indexPath}`);

    // Show sample with actual field names
    console.log('\n📋 Sample exercise (showing all fields):');
    console.log(JSON.stringify(exercises[0], null, 2));

    // Check for bridge exercises
    const bridges = exercises.filter(ex => ex.name.toLowerCase().includes('bridge'));
    console.log(`\n🔍 Found ${bridges.length} bridge-related exercises:`);
    bridges.slice(0, 10).forEach(ex => {
      console.log(`   - ${ex.name}`);
    });
  }

  console.log('\n✅ COMPLETE!\n');
}

main();
