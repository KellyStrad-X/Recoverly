# ExerciseDB Scripts

This directory contains scripts for working with the ExerciseDB API and testing the exercise media integration.

## Active Scripts

### `test-new-gif-service.js` ✅ **USE THIS**
Tests the current GIF service implementation with:
- Fuzzy exercise name matching using the complete database
- GIF fetching via `/image` endpoint with auth headers
- Base64 conversion for React Native Image component

**Usage:**
```bash
node scripts/test-new-gif-service.js
```

**Requirements:**
- `EXPO_PUBLIC_RAPIDAPI_KEY` in `.env`
- Tests exercises like "Hip Bridges", "Squats", etc.

## Database Files (DO NOT DELETE)

- **`exercisedb-complete.json`** - Full database of 1,324 exercises from ExerciseDB Ultra plan
- **`exercisedb-complete-index.json`** - Lightweight index (id, name, bodyPart, target, equipment) used by the app

## Legacy Scripts (For Reference Only)

These scripts were used during development to explore the API and fetch the complete database. They are kept for reference but not needed for regular use:

- `explore-exercisedb-endpoints.js` - Explored different ExerciseDB endpoints
- `fetch-all-exercises-paginated.js` - Fetched the complete 1,324 exercise database
- `fetch-exercisedb-list.js` - Early exploration of the API
- `test-gif-endpoint.js` - Tested the `/image` endpoint discovery
- `test-image-service.js` - Tested various GIF fetching approaches

## Implementation Notes

### How GIF Fetching Works

1. **Exercise Name Matching**: Uses Fuse.js fuzzy matching on `exercisedb-complete-index.json`
   - Example: "Hip Bridges" → matches "barbell glute bridge" (ID: 1409)

2. **GIF Endpoint**: `https://exercisedb.p.rapidapi.com/image?exerciseId={id}&resolution=1080`
   - Requires RapidAPI auth headers
   - Returns GIF as blob

3. **React Native Compatibility**:
   - Fetches GIF as ArrayBuffer
   - Converts to base64 using Buffer library
   - Returns as data URI: `data:image/gif;base64,{base64_data}`
   - React Native Image component can display data URIs

### Why This Approach?

- ExerciseDB API doesn't include `gifUrl` in exercise data (even on Ultra plan)
- React Native `<Image>` component doesn't support custom headers
- Base64 data URIs work universally across React Native platforms
- Component-level caching prevents redundant fetches (ToS compliant)

## Testing

To test the GIF service in your app:

1. Ensure `.env` has `EXPO_PUBLIC_RAPIDAPI_KEY`
2. Run the app: `npm start`
3. Navigate to a plan with exercises
4. Expand an exercise (e.g., "Hip Bridges")
5. Check console logs for:
   ```
   🔍 Searching exercise database for: Hip Bridges
   ✅ Found match: "barbell glute bridge" (ID: 1409, score: 0.35)
   🎬 Fetching GIF from: https://exercisedb.p.rapidapi.com/image?exerciseId=1409&resolution=1080
   ✅ GIF fetched successfully (245.3 KB)
   ```

## Troubleshooting

**No GIF showing?**
1. Check console for error messages
2. Verify RapidAPI key is correct and has Ultra plan access
3. Check network tab for 401/403 errors (auth issue) or 404 (wrong exercise ID)
4. Try running `test-new-gif-service.js` to isolate the issue

**Exercise name not matching?**
- Fuzzy matching threshold is 0.4 (adjust in `exerciseMediaService.ts` if needed)
- Check `exercisedb-complete-index.json` to see if similar exercise exists
- Consider adding manual fallback if needed

**GIF too large?**
- Current resolution: 1080
- Can use 720 or 480 for smaller file sizes
- Adjust in `exerciseMediaService.ts`: `resolution=720`
