Milestone 2: Implement YouTube video metadata fetching.

Add:
- lib/youtube/video-info-provider.ts
- app/api/video-info/route.ts
- components/video-header.tsx

Use YouTube oEmbed as the first metadata provider:
https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={videoId}&format=json

Return:
- videoId
- title
- authorName
- authorUrl
- thumbnailUrl
- provider
- fetchedAt

Requirements:
- Validate request body with Zod.
- Add fetch timeout.
- Add graceful fallback if oEmbed fails.
- No API key required for this milestone.
- Display metadata on /video/[videoId]/page.tsx.

Acceptance criteria:
- /api/video-info returns metadata for a valid public YouTube video.
- Workspace page displays title, author, thumbnail, and embedded YouTube player.
- Typecheck and lint pass.