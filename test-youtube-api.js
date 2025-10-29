/**
 * Simple test script to verify YouTube API key
 * Run with: node test-youtube-api.js
 *
 * Tests:
 * 1. Minimal request (just part, q, key)
 * 2. Full request with all params
 */

require('dotenv').config();

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

async function testMinimalRequest() {
  console.log('\n=== TEST 1: Minimal Request ===');
  console.log('API Key:', YOUTUBE_API_KEY ? `${YOUTUBE_API_KEY.substring(0, 10)}...` : 'NOT FOUND');

  if (!YOUTUBE_API_KEY) {
    console.error('ERROR: EXPO_PUBLIC_YOUTUBE_API_KEY not found in .env file');
    return;
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: 'hip bridges exercise',
    key: YOUTUBE_API_KEY,
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  console.log('URL:', url.replace(YOUTUBE_API_KEY, '[HIDDEN]'));

  try {
    const response = await fetch(url);
    console.log('Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Found', data.items?.length || 0, 'videos');
      if (data.items?.[0]) {
        console.log('First result:', data.items[0].snippet.title);
      }
    } else {
      console.log('❌ ERROR!');
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ FETCH ERROR:', error.message);
  }
}

async function testFullRequest() {
  console.log('\n=== TEST 2: Full Request (with filters) ===');

  if (!YOUTUBE_API_KEY) {
    console.error('ERROR: EXPO_PUBLIC_YOUTUBE_API_KEY not found in .env file');
    return;
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: 'hip bridges physical therapy exercise tutorial',
    type: 'video',
    maxResults: '1',
    videoDuration: 'short',
    videoEmbeddable: 'true',
    key: YOUTUBE_API_KEY,
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  console.log('URL:', url.replace(YOUTUBE_API_KEY, '[HIDDEN]'));

  try {
    const response = await fetch(url);
    console.log('Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Found', data.items?.length || 0, 'videos');
      if (data.items?.[0]) {
        console.log('First result:', data.items[0].snippet.title);
      }
    } else {
      console.log('❌ ERROR!');
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ FETCH ERROR:', error.message);
  }
}

async function runTests() {
  console.log('🧪 YouTube API Key Test');
  console.log('========================');

  await testMinimalRequest();
  await testFullRequest();

  console.log('\n========================');
  console.log('Tests complete!');
}

runTests();
