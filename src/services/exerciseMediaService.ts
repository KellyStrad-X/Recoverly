import Constants from 'expo-constants';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Exercise Media Service - YouTube Integration with Caching
 *
 * CACHING POLICY:
 * - YouTube Data API: Caching ALLOWED for up to 24 hours (per ToS Section III.E.4)
 * - We cache video IDs and metadata in Firestore for consistent user experience
 * - Users see the same video on repeat visits
 * - ExerciseDB: Caching PROHIBITED (deprecated - not using anymore)
 *
 * Implementation:
 * - Check Firestore cache first (with 24hr TTL)
 * - If cache miss or expired, fetch from YouTube API
 * - Store result in Firestore for future use
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
  if (!RAPIDAPI_KEY) {
    console.warn('RapidAPI key not configured');
    return null;
  }

  try {
    // Clean up exercise name for search
    const searchQuery = exerciseName.toLowerCase().trim();

    // Search ExerciseDB by name
    const response = await fetch(`${EXERCISEDB_BASE_URL}/exercises/name/${encodeURIComponent(searchQuery)}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error('ExerciseDB API error:', response.status);
      return null;
    }

    const data = await response.json();

    // Return first match's GIF URL
    if (data && data.length > 0 && data[0].gifUrl) {
      return data[0].gifUrl;
    }

    return null;
  } catch (error) {
    console.error('Error searching ExerciseDB:', error);
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
 * Fetch media for a single exercise - prioritizes cached YouTube videos
 * CACHING STRATEGY:
 * - YouTube: Check cache first (24hr TTL), fetch & cache if miss
 * - ExerciseDB: Deprecated (not using GIFs anymore)
 */
export const fetchExerciseMedia = async (
  exerciseId: string,
  exerciseName: string
): Promise<ExerciseMedia> => {
  console.log(`Fetching media for: ${exerciseName}`);

  const media: ExerciseMedia = {
    exerciseId,
    exerciseName,
    lastFetched: new Date(),
  };

  // Check YouTube cache first
  try {
    const cachedVideo = await getCachedYouTubeVideo(exerciseId);

    if (cachedVideo) {
      // Use cached video
      media.youtubeVideoId = cachedVideo.videoId;
      media.youtubeVideoTitle = cachedVideo.title;
    } else {
      // Cache miss - fetch from API and cache the result
      const youtubeResult = await searchYouTubeVideo(exerciseName);
      if (youtubeResult) {
        media.youtubeVideoId = youtubeResult.videoId;
        media.youtubeVideoTitle = youtubeResult.title;

        // Cache for future use
        await cacheYouTubeVideo(
          exerciseId,
          exerciseName,
          youtubeResult.videoId,
          youtubeResult.title
        );
      }
    }
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
  }

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
