import Constants from 'expo-constants';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Exercise Media Service - YouTube Integration
 *
 * STRATEGY:
 * - YouTube Videos: Primary visual aid (embedded inline with tap-to-play)
 * - Fullscreen modal: Optional for better viewing experience
 * - Fixed height container (280px) optimized for horizontal videos (16:9)
 *
 * CACHING POLICY:
 * - YouTube: Firestore caching ALLOWED (24hr TTL per ToS)
 *   - Cached by exercise NAME (not ID) for uniqueness
 *   - Consistent video experience across visits
 *   - Reduces API quota usage
 *
 * SEARCH STRATEGY:
 * - Find best match with concise explanation
 * - Prefer short videos (< 4 min) for quick demonstrations
 * - Search for "tutorial" and "demonstration" keywords
 * - Filter for embeddable videos to reduce playback errors
 * - Optimize for horizontal (16:9) videos to avoid pillarboxing
 */

const YOUTUBE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface ExerciseMedia {
  exerciseId: string;
  exerciseName: string;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
  youtubeThumbnail?: string;
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
 * Generate cache key from exercise name
 * Normalizes name to ensure consistent lookups
 */
const getCacheKey = (exerciseName: string): string => {
  return exerciseName.toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * Get cached YouTube video from Firestore
 * Uses exercise name (normalized) as cache key for uniqueness
 */
const getCachedYouTubeVideo = async (
  exerciseName: string
): Promise<{ videoId: string; title: string } | null> => {
  try {
    const cacheKey = getCacheKey(exerciseName);
    const cacheRef = doc(db, 'exerciseVideoCache', cacheKey);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      console.log(`No cached video for exercise: ${exerciseName}`);
      return null;
    }

    const cached = cacheDoc.data() as CachedYouTubeVideo;
    const now = new Date();
    const expiresAt = cached.expiresAt.toDate();

    // Check if cache is expired
    if (now > expiresAt) {
      console.log(`Cache expired for: ${exerciseName}`);
      return null;
    }

    console.log(`✅ Cache hit for: ${exerciseName} (${cached.videoId})`);
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
 * Uses exercise name (normalized) as cache key to ensure each exercise has unique video
 */
const cacheYouTubeVideo = async (
  exerciseName: string,
  videoId: string,
  videoTitle: string
): Promise<void> => {
  try {
    // Validate inputs to prevent Firebase errors
    if (!exerciseName || !videoId || !videoTitle) {
      console.warn('Skipping cache - missing required fields:', {
        exerciseName: !!exerciseName,
        videoId: !!videoId,
        videoTitle: !!videoTitle
      });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);
    const cacheKey = getCacheKey(exerciseName);

    const cacheData: CachedYouTubeVideo = {
      exerciseId: cacheKey, // Use normalized name as ID
      exerciseName,
      videoId,
      videoTitle,
      cachedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const cacheRef = doc(db, 'exerciseVideoCache', cacheKey);
    await setDoc(cacheRef, cacheData);

    console.log(`💾 Cached video for: ${exerciseName} -> ${videoId} (expires in 24h)`);
  } catch (error) {
    console.error('Error caching video:', error);
    // Don't throw - caching failure shouldn't block the user
  }
};

/**
 * Search YouTube for exercise tutorial video
 * Finds best match with concise explanation (prefers horizontal/16:9 format)
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

  // Search for best match with concise explanation
  // Prefer short videos but avoid very short ones (Shorts) which are vertical format
  const searchConfigs = [
    {
      name: 'short-tutorial',
      params: {
        part: 'snippet',
        q: `${exerciseName} physical therapy exercise tutorial`,
        type: 'video',
        maxResults: '1',
        videoDuration: 'short', // < 4 min for concise explanations
        videoEmbeddable: 'true',
        relevanceLanguage: 'en',
        key: YOUTUBE_API_KEY,
      },
    },
    {
      name: 'fallback',
      params: {
        part: 'snippet',
        q: `${exerciseName} exercise demonstration`,
        type: 'video',
        maxResults: '1',
        videoEmbeddable: 'true',
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
 * Fetch media for a single exercise - YouTube only
 *
 * STRATEGY:
 * - Use exercise NAME (not ID) as cache key for uniqueness
 * - Check cache first (24hr TTL)
 * - If cache miss, fetch from YouTube API (best match, concise explanation)
 * - Prefer horizontal videos (16:9) for consistent container display
 * - Cache result for future use
 *
 * Component-level caching (caller's responsibility):
 * - Store result in React state
 * - Don't re-fetch if already in state
 */
export const fetchExerciseMedia = async (
  exerciseId: string,
  exerciseName: string
): Promise<ExerciseMedia> => {
  const media: ExerciseMedia = {
    exerciseId,
    exerciseName,
    lastFetched: new Date(),
  };

  try {
    // Check cache first - using exercise name for uniqueness
    const cachedVideo = await getCachedYouTubeVideo(exerciseName);

    if (cachedVideo) {
      media.youtubeVideoId = cachedVideo.videoId;
      media.youtubeVideoTitle = cachedVideo.title;
      media.youtubeThumbnail = `https://img.youtube.com/vi/${cachedVideo.videoId}/hqdefault.jpg`;
      return media;
    }

    // Cache miss - fetch from API (best match, concise explanation, horizontal video)
    console.log(`🔍 Searching YouTube for: ${exerciseName}`);
    const result = await searchYouTubeVideo(exerciseName);
    if (result) {
      // Cache for future use (keyed by exercise name)
      await cacheYouTubeVideo(
        exerciseName,
        result.videoId,
        result.title
      );

      media.youtubeVideoId = result.videoId;
      media.youtubeVideoTitle = result.title;
      media.youtubeThumbnail = `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg`;

      console.log(`✅ Found video for ${exerciseName}: ${result.videoId}`);
    } else {
      console.warn(`⚠️ No video found for: ${exerciseName}`);
    }
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
  }

  return media;
};

/**
 * Helper to check if YouTube API key is configured
 */
export const isYouTubeConfigured = (): boolean => {
  return !!YOUTUBE_API_KEY;
};
