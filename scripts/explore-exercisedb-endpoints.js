/**
 * Explore ExerciseDB API endpoints
 * Run: node scripts/explore-exercisedb-endpoints.js
 */

require('dotenv').config();

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

async function fetchEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n📡 Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    console.log(`📥 Status: ${response.status}`);

    if (!response.ok) {
      console.error('❌ Error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    return null;
  }
}

async function exploreAPI() {
  console.log('🔍 EXPLORING EXERCISEDB API ENDPOINTS\n');
  console.log('='.repeat(50));

  if (!RAPIDAPI_KEY) {
    console.error('❌ EXPO_PUBLIC_RAPIDAPI_KEY not found in .env');
    process.exit(1);
  }

  // 1. Body Part List
  console.log('\n\n1️⃣ BODY PART LIST');
  console.log('='.repeat(50));
  const bodyParts = await fetchEndpoint('/exercises/bodyPartList');
  if (bodyParts) {
    console.log('📊 Available body parts:', bodyParts);
  }

  // 2. Target Muscle List
  console.log('\n\n2️⃣ TARGET MUSCLE LIST');
  console.log('='.repeat(50));
  const targets = await fetchEndpoint('/exercises/targetList');
  if (targets) {
    console.log('📊 Available targets:', targets);
  }

  // 3. Equipment List
  console.log('\n\n3️⃣ EQUIPMENT LIST');
  console.log('='.repeat(50));
  const equipment = await fetchEndpoint('/exercises/equipmentList');
  if (equipment) {
    console.log('📊 Available equipment:', equipment);
  }

  // 4. Exercises by Body Part (example: upper legs)
  console.log('\n\n4️⃣ EXERCISES BY BODY PART (upper legs)');
  console.log('='.repeat(50));
  const upperLegExercises = await fetchEndpoint('/exercises/bodyPart/upper legs');
  if (upperLegExercises) {
    console.log('📊 Found', upperLegExercises.length, 'exercises');
    console.log('📝 Sample exercises:');
    upperLegExercises.slice(0, 10).forEach(ex => {
      console.log(`   - ${ex.name} (${ex.target})`);
    });
  }

  // 5. Search by name (bridge)
  console.log('\n\n5️⃣ SEARCH BY NAME (bridge)');
  console.log('='.repeat(50));
  const bridgeExercises = await fetchEndpoint('/exercises/name/bridge');
  if (bridgeExercises) {
    console.log('📊 Found', bridgeExercises.length, 'exercises');
    bridgeExercises.forEach(ex => {
      console.log(`   - ${ex.name} (${ex.bodyPart} - ${ex.target})`);
      console.log(`     Equipment: ${ex.equipment}`);
      console.log(`     GIF: ${ex.gifUrl}`);
    });
  }

  // 6. Search by name (hip)
  console.log('\n\n6️⃣ SEARCH BY NAME (hip)');
  console.log('='.repeat(50));
  const hipExercises = await fetchEndpoint('/exercises/name/hip');
  if (hipExercises) {
    console.log('📊 Found', hipExercises.length, 'exercises');
    hipExercises.forEach(ex => {
      console.log(`   - ${ex.name}`);
    });
  }

  // 7. Exercises by target (glutes)
  console.log('\n\n7️⃣ EXERCISES BY TARGET MUSCLE (glutes)');
  console.log('='.repeat(50));
  const gluteExercises = await fetchEndpoint('/exercises/target/glutes');
  if (gluteExercises) {
    console.log('📊 Found', gluteExercises.length, 'exercises');
    console.log('📝 Sample exercises:');
    gluteExercises.slice(0, 10).forEach(ex => {
      console.log(`   - ${ex.name}`);
    });
  }

  console.log('\n\n' + '='.repeat(50));
  console.log('✅ EXPLORATION COMPLETE!');
  console.log('='.repeat(50));
}

exploreAPI();
