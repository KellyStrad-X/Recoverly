import Constants from 'expo-constants';

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

  try {
    // Build search query - add "physical therapy" for better results
    const searchQuery = `${exerciseName} physical therapy exercise tutorial`;

    const response = await fetch(
      `${YOUTUBE_BASE_URL}/search?` +
        new URLSearchParams({
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          maxResults: '1',
          videoDuration: 'short', // Prefer short videos (< 4 min)
          videoEmbeddable: 'true',
          key: YOUTUBE_API_KEY,
        })
    );

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const firstResult = data.items[0];
      return {
        videoId: firstResult.id.videoId,
        title: firstResult.snippet.title,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
};

/**
 * Fetch media for a single exercise (GIF + YouTube)
 * This is the main function to call
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

  // Try ExerciseDB first (fast, auto-playing GIFs)
  try {
    const gifUrl = await searchExerciseDBByName(exerciseName);
    if (gifUrl) {
      media.gifUrl = gifUrl;
      console.log(`Found GIF for ${exerciseName}`);
    }
  } catch (error) {
    console.error('Error fetching ExerciseDB GIF:', error);
  }

  // Try YouTube (tutorial videos)
  try {
    const youtubeResult = await searchYouTubeVideo(exerciseName);
    if (youtubeResult) {
      media.youtubeVideoId = youtubeResult.videoId;
      media.youtubeVideoTitle = youtubeResult.title;
      console.log(`Found YouTube video for ${exerciseName}`);
    }
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
  }

  return media;
};

/**
 * Batch fetch media for multiple exercises
 * Useful for pre-loading all exercises in a plan
 */
export const fetchBatchExerciseMedia = async (
  exercises: Array<{ id: string; name: string }>
): Promise<Map<string, ExerciseMedia>> => {
  const mediaMap = new Map<string, ExerciseMedia>();

  // Fetch serially to avoid rate limiting (could parallelize with Promise.all if needed)
  for (const exercise of exercises) {
    try {
      const media = await fetchExerciseMedia(exercise.id, exercise.name);
      mediaMap.set(exercise.id, media);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching media for ${exercise.name}:`, error);
    }
  }

  return mediaMap;
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
