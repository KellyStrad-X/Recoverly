import Constants from 'expo-constants';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Exercise Media Service - Hybrid GIF + YouTube Integration
 *
 * STRATEGY:
 * - ExerciseDB GIFs: Primary visual (always show if available)
 * - YouTube Videos: Optional enhancement (button to watch tutorial)
 *
 * CACHING POLICY:
 * - ExerciseDB: NO persistent caching (per ToS)
 *   - Component-level caching OK (React state during session)
 *   - Prevents redundant API calls on re-expansion
 * - YouTube: Firestore caching ALLOWED (24hr TTL per ToS)
 *   - Consistent video experience across visits
 *
 * QUOTA MANAGEMENT:
 * - Component state prevents re-fetching on collapse/expand
 * - Typical usage: ~1-2 fetches per exercise per session
 * - Ultra plan (200k/month) supports ~5000 active users
 */

const RAPIDAPI_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_RAPIDAPI_KEY || process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const YOUTUBE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

const EXERCISEDB_BASE_URL = 'https://exercisedb.p.rapidapi.com';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface ExerciseMedia {
  exerciseId: string;
  exerciseName: string;
  gifUrl?: string;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
  lastFetched: Date;
}

interface CachedYouTubeVideo {
  exerciseId: string;
  exerciseName: string;
  videoId: string;
  videoTitle: string;
  cachedAt: Timestamp;
  expiresAt: Timestamp;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours per YouTube ToS

/**
 * Search ExerciseDB for a matching exercise by name
 * Returns the GIF URL if found
 */
export const searchExerciseDBByName = async (exerciseName: string): Promise<string | null> => {
  console.log('🔍 Searching ExerciseDB for:', exerciseName);

  if (!RAPIDAPI_KEY) {
    console.error('❌ RapidAPI key not configured');
    return null;
  }

  console.log('✅ RapidAPI Key loaded:', RAPIDAPI_KEY.substring(0, 10) + '...');

  try {
    // Clean up exercise name for search
    const searchQuery = exerciseName.toLowerCase().trim();
    const url = `${EXERCISEDB_BASE_URL}/exercises/name/${encodeURIComponent(searchQuery)}`;

    console.log('📡 ExerciseDB Request URL:', url);
    console.log('📡 Search query:', searchQuery);

    // Search ExerciseDB by name
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    console.log('📥 ExerciseDB Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      console.error('❌ ExerciseDB API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('📦 ExerciseDB Response data:', JSON.stringify(data).substring(0, 200) + '...');
    console.log('📊 Found', data?.length || 0, 'exercises');

    // Return first match's GIF URL
    if (data && data.length > 0 && data[0].gifUrl) {
      console.log('✅ Found GIF URL:', data[0].gifUrl);
      return data[0].gifUrl;
    }

    console.warn('⚠️ No GIF found in ExerciseDB response');
    return null;
  } catch (error) {
    console.error('❌ Error searching ExerciseDB:', error);
    return null;
  }
};

/**
 * Get cached YouTube video from Firestore
 */
const getCachedYouTubeVideo = async (
  exerciseId: string
): Promise<{ videoId: string; title: string } | null> => {
  try {
    const cacheRef = doc(db, 'exerciseVideoCache', exerciseId);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      console.log(`No cached video for exercise: ${exerciseId}`);
      return null;
    }

    const cached = cacheDoc.data() as CachedYouTubeVideo;
    const now = new Date();
    const expiresAt = cached.expiresAt.toDate();

    // Check if cache is expired
    if (now > expiresAt) {
      console.log(`Cached video expired for exercise: ${exerciseId}`);
      return null;
    }

    console.log(`✅ Using cached video for: ${cached.exerciseName}`);
    return {
      videoId: cached.videoId,
      title: cached.videoTitle,
    };
  } catch (error) {
    console.error('Error reading video cache:', error);
    return null;
  }
};

/**
 * Cache YouTube video in Firestore (24 hour TTL per YouTube ToS)
 */
const cacheYouTubeVideo = async (
  exerciseId: string,
  exerciseName: string,
  videoId: string,
  videoTitle: string
): Promise<void> => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

    const cacheData: CachedYouTubeVideo = {
      exerciseId,
      exerciseName,
      videoId,
      videoTitle,
      cachedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const cacheRef = doc(db, 'exerciseVideoCache', exerciseId);
    await setDoc(cacheRef, cacheData);

    console.log(`💾 Cached video for: ${exerciseName} (expires in 24h)`);
  } catch (error) {
    console.error('Error caching video:', error);
    // Don't throw - caching failure shouldn't block the user
  }
};

/**
 * Search YouTube for exercise tutorial video
 * Returns video ID and title if found
 */
export const searchYouTubeVideo = async (
  exerciseName: string
): Promise<{ videoId: string; title: string } | null> => {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured');
    return null;
  }

  // Debug: Verify API key is loaded (show only first 10 chars for security)
  console.log('YouTube API Key status:', YOUTUBE_API_KEY ? `Configured (${YOUTUBE_API_KEY.substring(0, 10)}...)` : 'Missing');

  // Build search query - add "physical therapy" for better results
  const searchQuery = `${exerciseName} physical therapy exercise tutorial`;

  // Try with duration filter first, fall back to basic search if that fails
  // Note: videoEmbeddable filter is unreliable, so we handle embed errors in the UI instead
  const searchConfigs = [
    {
      name: 'with-duration',
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: '1',
        videoDuration: 'short', // Prefer short videos (< 4 min)
        key: YOUTUBE_API_KEY,
      },
    },
    {
      name: 'basic',
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: '1',
        key: YOUTUBE_API_KEY,
      },
    },
  ];

  for (const config of searchConfigs) {
    try {
      const params = new URLSearchParams(config.params);
      const requestUrl = `${YOUTUBE_BASE_URL}/search?${params}`;

      // Debug: Log request (hide API key)
      const debugParams = new URLSearchParams(params);
      debugParams.set('key', '[HIDDEN]');
      console.log(`YouTube request (${config.name}):`, `${YOUTUBE_BASE_URL}/search?${debugParams}`);

      const response = await fetch(requestUrl);

      if (!response.ok) {
        // Get detailed error message from YouTube
        const errorData = await response.json().catch(() => null);
        console.error(`YouTube API error (${config.name}):`, response.status);
        console.error('YouTube error details:', JSON.stringify(errorData, null, 2));

        // Try next config
        continue;
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const firstResult = data.items[0];
        console.log(`✅ YouTube success with ${config.name} config`);
        return {
          videoId: firstResult.id.videoId,
          title: firstResult.snippet.title,
        };
      }

      console.log(`No results with ${config.name} config, trying next...`);
    } catch (error) {
      console.error(`Error with ${config.name} config:`, error);
      // Try next config
    }
  }

  // All configs failed
  console.error('All YouTube search configs failed');
  return null;
};

/**
 * Fetch media for a single exercise - Hybrid approach
 * STRATEGY:
 * - ExerciseDB GIF: Primary visual (fetch fresh per ToS)
 * - YouTube: Optional enhancement (use cache if available)
 *
 * Component-level caching (caller's responsibility):
 * - Store result in React state
 * - Don't re-fetch if already in state
 * - This is ToS compliant (not persistent storage)
 */
export const fetchExerciseMedia = async (
  exerciseId: string,
  exerciseName: string
): Promise<ExerciseMedia> => {
  console.log(`\n🎬 ========== FETCHING MEDIA ==========`);
  console.log(`📝 Exercise: ${exerciseName} (ID: ${exerciseId})`);

  const media: ExerciseMedia = {
    exerciseId,
    exerciseName,
    lastFetched: new Date(),
  };

  console.log('🚀 Starting parallel fetch (GIF + YouTube)...');

  // Fetch both in parallel for speed
  const [gifUrl, youtubeResult] = await Promise.all([
    // ExerciseDB GIF - primary visual
    searchExerciseDBByName(exerciseName).catch((error) => {
      console.error('❌ Error fetching ExerciseDB GIF:', error);
      return null;
    }),

    // YouTube - check cache first, then fetch if needed
    (async () => {
      try {
        const cachedVideo = await getCachedYouTubeVideo(exerciseId);

        if (cachedVideo) {
          console.log(`✅ Using cached YouTube video for: ${exerciseName}`);
          return cachedVideo;
        }

        // Cache miss - fetch from API
        const result = await searchYouTubeVideo(exerciseName);
        if (result) {
          // Cache for future use
          await cacheYouTubeVideo(
            exerciseId,
            exerciseName,
            result.videoId,
            result.title
          );
          return result;
        }
        return null;
      } catch (error) {
        console.error('Error fetching YouTube video:', error);
        return null;
      }
    })(),
  ]);

  // Populate media object
  console.log('\n📊 ========== RESULTS ==========');
  if (gifUrl) {
    media.gifUrl = gifUrl;
    console.log(`✅ GIF: Found (${gifUrl.substring(0, 50)}...)`);
  } else {
    console.log(`❌ GIF: Not found`);
  }

  if (youtubeResult) {
    media.youtubeVideoId = youtubeResult.videoId;
    media.youtubeVideoTitle = youtubeResult.title;
    console.log(`✅ YouTube: Found (${youtubeResult.videoId})`);
  } else {
    console.log(`❌ YouTube: Not found`);
  }

  console.log(`========== END FETCH ==========\n`);
  return media;
};

/**
 * Helper to check if API keys are configured
 */
export const areAPIKeysConfigured = (): {
  exerciseDB: boolean;
  youtube: boolean;
} => {
  return {
    exerciseDB: !!RAPIDAPI_KEY,
    youtube: !!YOUTUBE_API_KEY,
  };
};
