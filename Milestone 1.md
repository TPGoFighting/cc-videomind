Milestone 1: Scaffold the VideoMind app.

Create or update a Next.js App Router TypeScript project with Tailwind CSS and shadcn/ui-ready structure.

Implement:
- app/page.tsx with a polished landing page and YouTube URL input.
- app/video/[videoId]/page.tsx with a placeholder workspace layout.
- components/video-url-input.tsx that validates YouTube URLs and navigates to /video/[videoId].
- lib/youtube/url.ts with robust videoId extraction from:
  - youtube.com/watch?v=
  - youtu.be/
  - youtube.com/shorts/
  - youtube.com/embed/
- lib/types.ts for shared types.
- .env.example with placeholder variables.

Do not implement AI, Supabase, Stripe, or transcript yet.

Acceptance criteria:
- User can paste a YouTube URL and navigate to /video/[videoId].
- Invalid URLs show a friendly error.
- npm run typecheck passes.
- npm run lint passes.