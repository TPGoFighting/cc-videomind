Task: Implement the transcript provider interface and mock provider.

Context:
This is a Next.js App Router TypeScript app named VideoMind. The product lets users paste a YouTube URL and analyze the transcript with AI.

Files to create or update:
- lib/transcript/types.ts
- lib/transcript/transcript-provider.ts
- lib/transcript/mock-transcript-provider.ts
- lib/transcript/index.ts
- app/api/transcript/route.ts
- components/transcript-viewer.tsx

Requirements:
- Use Zod validation in the API route.
- Return timestamped TranscriptSegment[].
- Mock provider should be deterministic and realistic.
- Do not add AI or Supabase in this task.
- Add tests if the project already has a test setup.

Validation:
Run:
- npm run typecheck
- npm run lint

Final response:
Summarize changed files, behavior, and test results.