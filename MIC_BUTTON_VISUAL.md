# 🎤 Microphone Button - What You Should See

## Location in Chat Screen

The microphone button is in the **input bar** at the bottom of the chat:

```
┌─────────────────────────────────────┐
│                                     │
│         Chat Messages Area          │
│                                     │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ 🎤  Type your message...  ➤  │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
     ↑                            ↑
   Mic Button                Send Button
```

## Visual Details

**Normal State:**
- **Icon:** microphone-outline
- **Color:** Gray (#8E8E93)
- **Background:** Dark gray circle (#2C2C2E)
- **Size:** 36x36 pixels

**Recording State (when pressed):**
- **Icon:** microphone (filled)
- **Color:** Red (#FF3B30)
- **Background:** Semi-transparent red
- **Text field:** Shows "Listening..." placeholder

## How to Test

1. **Pull latest code:**
   ```bash
   git pull origin p2_imp
   ```

2. **Clear cache and restart:**
   ```bash
   npx expo start -c
   ```

3. **Open chat screen:**
   - Navigate to Recovery Intake
   - Look at the input bar at bottom

4. **Test the button:**
   - Tap the microphone icon
   - On mobile: You'll see "Coming Soon" alert
   - In web browser: It will actually record

## If You Don't See It

**Option 1: Force reload on phone**
- Shake device → "Reload" option
- Or press `r` in terminal

**Option 2: Check the file directly**
Look at `app/(intake)/chat.tsx` lines 332-341:
- The `<TouchableOpacity>` with `styles.micButton`
- Contains `MaterialCommunityIcons` with microphone icon

**Option 3: Try web browser**
```bash
# Press 'w' in Expo terminal
# Opens in browser where it definitely works
```

## What It Looks Like in Code

```tsx
<View style={styles.inputWrapper}>
  <TouchableOpacity style={[styles.micButton]}>
    <MaterialCommunityIcons name="microphone-outline" />
  </TouchableOpacity>

  <TextInput placeholder="Describe your pain..." />

  <TouchableOpacity style={[styles.sendButton]}>
    <MaterialCommunityIcons name="send" />
  </TouchableOpacity>
</View>
```

The mic button is the FIRST element in the input wrapper, so it appears on the LEFT.