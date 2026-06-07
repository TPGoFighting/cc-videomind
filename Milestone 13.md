Milestone 13: Improve UX for progressive AI generation.

Goal:
Make the app feel fast even when AI tasks take time.

Implement:
- Loading states for metadata, transcript, summary, highlights, and chat.
- Show metadata and player first.
- Load transcript independently.
- Generate quick preview from the first 500 transcript words.
- Generate summary and highlights in parallel.
- Cache each successful result independently.
- If one AI task fails, other panels should still work.
- Add toast notifications for partial failures.

Acceptance criteria:
- A user sees useful content quickly after pasting a URL.
- Summary failure does not block transcript or highlights.
- Highlights failure does not block summary or chat.
- UI clearly shows which parts are cached, loading, failed, or ready.
- Typecheck and lint pass.