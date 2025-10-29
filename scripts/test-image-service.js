/**
 * Test ExerciseDB Image Service endpoint
 * Run: node scripts/test-image-service.js
 */

require('dotenv').config();

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

async function testImageService() {
  console.log('🔍 TESTING EXERCISEDB IMAGE SERVICE\n');
  console.log('='.repeat(50));

  const testExerciseId = '0001'; // 3/4 sit-up

  // Test different parameter formats
  const testUrls = [
    `${BASE_URL}/image`,
    `${BASE_URL}/image?id=${testExerciseId}`,
    `${BASE_URL}/image?exerciseId=${testExerciseId}`,
    `${BASE_URL}/image/${testExerciseId}`,
  ];

  for (const url of testUrls) {
    console.log(`\n📡 Testing: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });

      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('image')) {
          console.log('  ✅ Returns an image!');
          console.log(`  🎯 This is the GIF endpoint!`);
        } else {
          const text = await response.text();
          console.log(`  Response: ${text.substring(0, 200)}`);
        }
      } else {
        const text = await response.text();
        console.log(`  ❌ Error: ${text}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test with multiple exercise IDs
  console.log('\n\n🎯 TESTING MULTIPLE EXERCISES');
  console.log('='.repeat(50));

  const exerciseIds = ['0001', '0002', '0003', '1409']; // Including barbell glute bridge

  for (const id of exerciseIds) {
    console.log(`\nExercise ${id}:`);

    const url = `${BASE_URL}/image?id=${id}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });

      console.log(`  Status: ${response.status}`);

      if (response.ok && response.headers.get('content-type')?.includes('image')) {
        console.log(`  ✅ GIF available at: ${url}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n💡 SOLUTION:');
  console.log('GIF URLs should be constructed as:');
  console.log('  https://exercisedb.p.rapidapi.com/image?id={exerciseId}');
  console.log('\nIn your app, use these URLs with RapidAPI auth headers.');

  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETE\n');
}

testImageService();
