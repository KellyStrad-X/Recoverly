import Constants from 'expo-constants';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Exercise Media Service - YouTube Integration
 *
 * STRATEGY:
 * - YouTube Videos: Primary visual aid (embedded inline with tap-to-play)
 * - Fullscreen modal: Optional for better viewing experience
 *
 * CACHING POLICY:
 * - YouTube: Firestore caching ALLOWED (24hr TTL per ToS)
 *   - Consistent video experience across visits
 *   - Reduces API quota usage
 *
 * EXERCISE MATCHING:
 * - AI provides exact exercise names from curated list
 * - Search includes "physical therapy exercise tutorial" for better results
 * - Filters for short, embeddable videos to reduce playback errors
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
      return null;
    }
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
    // Validate inputs to prevent Firebase errors
    if (!exerciseId || !exerciseName || !videoId || !videoTitle) {
      console.warn('Skipping cache - missing required fields:', {
        exerciseId: !!exerciseId,
        exerciseName: !!exerciseName,
        videoId: !!videoId,
        videoTitle: !!videoTitle
      });
      return;
    }

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
  // Note: videoEmbeddable filter helps reduce Error 153, but isn't 100% reliable
  // We still handle embed errors gracefully in the UI as a fallback
  const searchConfigs = [
    {
      name: 'with-duration',
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: '1',
        videoDuration: 'short', // Prefer short videos (< 4 min)
        videoEmbeddable: 'true', // Filter for embeddable videos to reduce Error 153
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
        videoEmbeddable: 'true', // Filter for embeddable videos to reduce Error 153
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
 * - Check cache first (24hr TTL)
 * - If cache miss, fetch from YouTube API
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
    // Check cache first
    const cachedVideo = await getCachedYouTubeVideo(exerciseId);

    if (cachedVideo) {
      media.youtubeVideoId = cachedVideo.videoId;
      media.youtubeVideoTitle = cachedVideo.title;
      media.youtubeThumbnail = `https://img.youtube.com/vi/${cachedVideo.videoId}/hqdefault.jpg`;
      return media;
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

      media.youtubeVideoId = result.videoId;
      media.youtubeVideoTitle = result.title;
      media.youtubeThumbnail = `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg`;
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
