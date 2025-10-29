# YouTube Embed Analysis - Error 153 Investigation

## Current State of YouTube Embeds in Codebase

### 1. Plan Detail Page (`app/plan/[id].tsx`)
**Implementation**: Inline WebView with HTML iframe
**Location**: Lines 216-266
**Error Handling**: ❌ **NONE**

```tsx
<WebView
  source={{ html: `<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1..."></iframe>` }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  allowsFullscreenVideo={true}
  scrollEnabled={false}
/>
```

**Problems**:
- No `onError` handler
- No `onHttpError` handler
- No fallback UI when embed fails
- User sees black box or YouTube's native "Video unavailable" message
- Any "Watch on YouTube" link from YouTube's error message is inside the iframe and likely broken

---

### 2. Session Flow Modal (`src/components/SessionFlowModal.tsx`)
**Implementation**: YouTubeModal component (popup)
**Location**: Lines 504-511
**Error Handling**: ✅ **HAS ERROR HANDLING** (via YouTubeModal)

```tsx
<YouTubeModal
  visible={youtubeModalVisible}
  videoId={selectedVideo.videoId}
  videoTitle={selectedVideo.title}
  onClose={() => setYoutubeModalVisible(false)}
/>
```

---

### 3. YouTube Modal Component (`src/components/YouTubeModal.tsx`)
**Implementation**: Modal with WebView + error handling
**Error Handling**: ✅ **FULL ERROR HANDLING**

**Features**:
- `onError` callback → sets `embedError` state
- `onHttpError` callback → sets `embedError` state
- Fallback UI with "Open in YouTube" button
- `openInYouTube()` function uses Linking API

**Problems Found**:
```tsx
const openInYouTube = async () => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const youtubeAppUrl = `vnd.youtube://watch?v=${videoId}`;

  try {
    const canOpen = await Linking.canOpenURL(youtubeAppUrl);
    if (canOpen) {
      await Linking.openURL(youtubeAppUrl);  // Opens YouTube app
    } else {
      await Linking.openURL(youtubeUrl);     // Opens browser
    }
  } catch (error) {
    Alert.alert('Error', 'Could not open YouTube');
  }
};
```

**Potential Issue**: The browser URL opens the full YouTube website (with scrollable comments, recommended videos, etc.) - not just the video player.

---

## Error 153 Explanation

**YouTube Error 153**: "This video cannot be played"

**Causes**:
1. Video owner disabled embedding
2. Video has age restrictions
3. Video has regional restrictions
4. Video was removed/made private

**Why our `videoEmbeddable: true` filter doesn't work**:
- YouTube's API search filter is unreliable
- Videos can disable embedding AFTER being indexed
- Some videos report as embeddable but aren't

---

## Root Causes of Current Issues

### Issue #1: Error 153 in Plan Detail Page
**Where**: `app/plan/[id].tsx` inline embed
**Cause**: No error detection → user sees:
  - Black box (if iframe fails silently)
  - YouTube's native error message (if iframe loads but video fails)

**YouTube's error message might include a "Watch on YouTube" link** that's inside the iframe and either:
- Opens in the WebView (wrong behavior)
- Is blocked by the WebView (closes/does nothing)

### Issue #2: "Watch on YouTube" Button Behavior
**Two scenarios**:

1. **If testing in Plan Detail Page**:
   - Error message is YouTube's native UI inside iframe
   - Link doesn't work because it's sandboxed in WebView

2. **If testing in Session Flow Modal**:
   - YouTubeModal's "Open in YouTube" button works
   - But opens full YouTube website (with comments, etc.)
   - User probably wants video player only

---

## Required Fixes

### Fix #1: Add Error Handling to Plan Detail Page
Need to add the same error handling as YouTubeModal:
- `onError` callback
- `onHttpError` callback
- Fallback UI with "Open in YouTube" button

### Fix #2: Test if WebView Error Handlers Work with HTML Source
**Question**: Do `onError` and `onHttpError` work when using `source={{ html: '...' }}`?
- They might only work with `source={{ uri: '...' }}`
- Need to test or switch to URI-based loading

### Fix #3: Fix "Open in YouTube" Deep Link
Current behavior: Opens full YouTube website
Desired behavior: Opens video player

**Options**:
a) Keep current (works but not ideal)
b) Use YouTube app deep link only (fails if app not installed)
c) Show instructions to copy link

---

## Recommended Solution

### Option A: Use YouTubeModal Everywhere (Consistent)
- Replace inline embed in plan/[id].tsx with YouTubeModal
- Button: "Watch Tutorial" → opens modal
- Consistent UX across plan detail and session flow

### Option B: Fix Inline Embed with Proper Error Handling
- Keep inline embed in plan/[id].tsx
- Add error detection (might need to switch from HTML to URI source)
- Add fallback UI with "Open in YouTube" button
- More complex but better UX (no modal needed)

### Option C: Hybrid Approach
- Try inline embed first
- If error detected, show "Watch Tutorial" button → opens YouTubeModal
- Best of both worlds but most complex

---

## Next Steps

1. **Confirm with user**: Where exactly are they seeing the issue?
   - Plan detail page (exercise accordion)?
   - Session flow modal?

2. **Test WebView error callbacks** with HTML source
   - If they don't work, need to switch to URI source

3. **Implement chosen solution** based on user preference

4. **Fix YouTube link behavior** if needed
   - Test app deep links
   - Consider fallback to video-only URL
