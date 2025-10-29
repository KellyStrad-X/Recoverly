/**
 * Fetch complete ExerciseDB exercise list
 * Run: node scripts/fetch-exercisedb-list.js
 *
 * This will:
 * 1. Fetch all exercises from ExerciseDB
 * 2. Save to a JSON file for inspection
 * 3. Help us build a proper mapping
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;

async function fetchAllExercises() {
  console.log('🔍 Fetching complete ExerciseDB exercise list...\n');

  if (!RAPIDAPI_KEY) {
    console.error('❌ EXPO_PUBLIC_RAPIDAPI_KEY not found in .env');
    process.exit(1);
  }

  console.log('✅ API Key loaded:', RAPIDAPI_KEY.substring(0, 10) + '...\n');

  try {
    // ExerciseDB endpoint to get all exercises
    // Note: limit parameter doesn't work - API returns all ~1300 exercises
    const url = 'https://exercisedb.p.rapidapi.com/exercises';

    console.log('📡 Fetching from:', url);
    console.log('⏳ This may take a moment (~1300 exercises)...\n');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      process.exit(1);
    }

    const exercises = await response.json();
    console.log('✅ Fetched', exercises.length, 'exercises\n');

    // Save full list
    const outputPath = path.join(__dirname, 'exercisedb-full-list.json');
    fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
    console.log('💾 Saved to:', outputPath);

    // Create a searchable index (just names and IDs)
    const index = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      bodyPart: ex.bodyPart,
      target: ex.target,
      equipment: ex.equipment,
      gifUrl: ex.gifUrl,
    }));

    const indexPath = path.join(__dirname, 'exercisedb-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log('📇 Created index:', indexPath);

    // Show some examples
    console.log('\n📊 Sample exercises:');
    exercises.slice(0, 10).forEach(ex => {
      console.log(`  - ${ex.name} (${ex.bodyPart})`);
    });

    // Search for bridge-related exercises
    console.log('\n🔍 Bridge-related exercises:');
    const bridgeExercises = exercises.filter(ex =>
      ex.name.toLowerCase().includes('bridge')
    );
    bridgeExercises.forEach(ex => {
      console.log(`  - ${ex.name}`);
    });

    console.log('\n✅ Done! Check the JSON files to see what ExerciseDB has.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchAllExercises();
