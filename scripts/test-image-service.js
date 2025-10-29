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

  // Test with resolution parameter (required!)
  const resolutionValues = ['1080p', '1080', 'high', '720p', '720', 'medium', '480p', '480', 'low'];

  console.log('\n1️⃣ FINDING CORRECT RESOLUTION VALUE\n');

  for (const resolution of resolutionValues) {
    const url = `${BASE_URL}/image?exerciseId=${testExerciseId}&resolution=${resolution}`;
    console.log(`\n📡 Testing resolution: "${resolution}"`);
    console.log(`   URL: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });

      console.log(`   Status: ${response.status}`);
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);

      if (response.ok) {
        if (contentType && contentType.includes('image')) {
          console.log(`   ✅ SUCCESS! This resolution works!`);
          console.log(`   🎯 Returns actual GIF image`);
          return resolution; // Return the working resolution
        } else {
          const text = await response.text();
          console.log(`   Response: ${text.substring(0, 200)}`);
        }
      } else {
        const text = await response.text();
        console.log(`   ❌ ${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Old test URLs (without resolution)
  console.log('\n\n2️⃣ TESTING WITHOUT RESOLUTION (should fail)');
  const testUrls = [
    `${BASE_URL}/image`,
    `${BASE_URL}/image?id=${testExerciseId}`,
    `${BASE_URL}/image?exerciseId=${testExerciseId}`,
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

  return null; // No resolution worked
}

async function main() {
  const workingResolution = await testImageService();

  if (workingResolution) {
    console.log('\n\n🎯 TESTING MULTIPLE EXERCISES WITH WORKING RESOLUTION');
    console.log('='.repeat(50));

    const exerciseIds = ['0001', '0002', '0003', '1409']; // Including barbell glute bridge

    for (const id of exerciseIds) {
      console.log(`\nExercise ${id}:`);

      const url = `${BASE_URL}/image?exerciseId=${id}&resolution=${workingResolution}`;

      try {
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': process.env.EXPO_PUBLIC_RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        });

        console.log(`  Status: ${response.status}`);

        if (response.ok && response.headers.get('content-type')?.includes('image')) {
          console.log(`  ✅ GIF available`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n\n💡 SOLUTION:');
    console.log(`✅ Working resolution: "${workingResolution}"`);
    console.log('\nGIF URLs should be constructed as:');
    console.log(`  https://exercisedb.p.rapidapi.com/image?exerciseId={id}&resolution=${workingResolution}`);
    console.log('\nIn your app, fetch these URLs with RapidAPI auth headers.');
  } else {
    console.log('\n\n❌ Could not find working resolution parameter');
    console.log('Check RapidAPI dashboard for resolution values');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETE\n');
}

main();
