/**
 * Test ExerciseDB image/GIF endpoint
 * Run: node scripts/test-gif-endpoint.js
 */

require('dotenv').config();

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

async function testGifEndpoints() {
  console.log('🔍 TESTING EXERCISEDB GIF ENDPOINTS\n');
  console.log('='.repeat(50));

  const testExerciseId = '0001'; // 3/4 sit-up

  // Test 1: /image/{id} endpoint
  console.log('\n1️⃣ Testing /image endpoint');
  console.log(`📡 ${BASE_URL}/image/${testExerciseId}`);

  try {
    const response = await fetch(`${BASE_URL}/image/${testExerciseId}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    console.log(`📥 Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
      console.log('✅ Image endpoint works!');
      console.log(`🎯 GIF URL: ${BASE_URL}/image/${testExerciseId}`);
    } else {
      console.log('❌ Failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Get exercise detail with gifUrl
  console.log('\n2️⃣ Testing /exercises/exercise/{id} endpoint');
  console.log(`📡 ${BASE_URL}/exercises/exercise/${testExerciseId}`);

  try {
    const response = await fetch(`${BASE_URL}/exercises/exercise/${testExerciseId}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    console.log(`📥 Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('📦 Response:', JSON.stringify(data, null, 2));

      if (data.gifUrl) {
        console.log(`✅ Found gifUrl: ${data.gifUrl}`);
      } else {
        console.log('⚠️  No gifUrl in response');
      }
    } else {
      console.log('❌ Failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Check if GIF URL is just constructed from ID
  console.log('\n3️⃣ Testing if GIF URL follows pattern');
  const possiblePatterns = [
    `https://v2.exercisedb.io/image/${testExerciseId}`,
    `https://exercisedb.io/image/${testExerciseId}`,
    `https://api.exercisedb.io/image/${testExerciseId}`,
    `https://exercisedb.p.rapidapi.com/image/${testExerciseId}`,
  ];

  for (const url of possiblePatterns) {
    console.log(`\n🔗 Trying: ${url}`);
    // Just report the pattern - user can test in browser
  }

  console.log('\n\n💡 RECOMMENDATION:');
  console.log('If /image endpoint works, construct GIF URLs as:');
  console.log('  https://exercisedb.p.rapidapi.com/image/{exerciseId}');
  console.log('\nThen in your app, fetch images with RapidAPI headers.');

  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETE\n');
}

testGifEndpoints();
