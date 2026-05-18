Milestone 4: Implement a real YouTube caption transcript provider.

Add:
- lib/transcript/youtube-caption-provider.ts

Goal:
Extract public YouTube captions when available. Keep this implementation isolated behind the TranscriptProvider interface.

Approach:
- Fetch the YouTube watch page for the given videoId.
- Extract caption track metadata if available.
- Select the best caption track using language preference:
  1. exact requested language manual caption
  2. exact requested language auto caption
  3. English manual caption
  4. English auto caption
  5. any manual caption
  6. any caption
- Fetch caption XML or JSON.
- Parse into TranscriptSegment[].
- Decode HTML entities.
- Normalize timestamps to seconds.
- Merge very short fragments only if it improves readability without destroying timestamp accuracy.

Error handling:
- If captions are unavailable, return a typed "NO_TRANSCRIPT" error.
- If YouTube blocks the request, return a typed "YOUTUBE_BLOCKED" error.
- Do not crash the route.
- Do not fake transcript content.

Update /api/transcript:
- Use real YouTube provider when TRANSCRIPT_PROVIDER=youtube.
- Fall back to mock only in development if ALLOW_MOCK_TRANSCRIPT=true.

Acceptance criteria:
- Works for at least one public YouTube video with captions.
- Fails gracefully for videos without captions.
- Transcript provider has unit tests for XML parsing.
- Typecheck and lint pass.