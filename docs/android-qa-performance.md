# Android QA and Performance Checklist

Use this after the backend is reachable from the emulator.

## Start App

```powershell
cd "D:\Work\Teach Player\apps\mobile"
npx expo start --port 8082 --host lan
```

For Android emulator with a local Next backend:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

## Emulator QA Flow

1. List emulator devices:

```powershell
adb devices
```

2. Launch with Expo Go or a dev build.
3. Validate these flows:

- Open Learn tab and paste a YouTube URL.
- Confirm invalid URLs keep the primary action disabled.
- Analyze a valid video and land on `video/[videoId]`.
- Confirm YouTube player renders and can seek.
- Tap a transcript segment and verify player seek.
- Open Moments and Summary panels.
- Ask a Chat question and verify citations are visible.
- Sign in, write a note, save it, then reopen the same video.
- Turn off network and confirm cached analysis still renders.
- Start Stripe Checkout from Settings and confirm it opens the browser.

## Accessibility Checks

- Every button-like element has `accessibilityRole="button"` or a native semantic equivalent.
- Tab buttons expose selected state.
- Touch targets are at least 44x44.
- Error and save status messages use live regions.
- Text remains readable with Android font scaling enabled.
- Color is never the only indication of error/success.

## Performance Evidence

Use one focused flow per capture: open a cached video, scroll transcript, switch panels, ask one chat question.

Quick frame snapshot:

```powershell
$SERIAL="<adb-serial>"
$PACKAGE="com.teachplayer.app"
$ARTIFACT_DIR="D:\Work\Teach Player\qa-artifacts"
New-Item -ItemType Directory -Path $ARTIFACT_DIR -Force | Out-Null
adb -s $SERIAL shell dumpsys gfxinfo $PACKAGE reset
# Perform the focused flow.
adb -s $SERIAL shell dumpsys gfxinfo $PACKAGE > "$ARTIFACT_DIR\gfxinfo.txt"
adb -s $SERIAL shell dumpsys gfxinfo $PACKAGE framestats > "$ARTIFACT_DIR\gfxinfo-framestats.txt"
```

Perfetto is preferred for root cause if the flow feels janky. Keep traces below 30 seconds and annotate exactly which flow was performed.
