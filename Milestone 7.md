Milestone 7: Implement AI highlight generation.

Add:
- app/api/video-analysis/route.ts
- lib/ai/prompts/highlights.ts
- lib/ai/schemas/highlights.ts
- lib/ai/chunk-transcript.ts
- components/highlights-panel.tsx

Input:
{
  videoId: string
  title?: string
  transcript: TranscriptSegment[]
  mode: "fast" | "smart"
  theme?: string
}

Output:
{
  highlights: {
    id: string
    title: string
    start: number
    end: number
    quote: string
    reason: string
    score: number
  }[]
}

Algorithm:
- Split transcript into 4-6 minute chunks with 30-45 seconds overlap.
- For each chunk, ask AI to propose candidate highlights.
- Each candidate must include exact quote from transcript, start, end, title, reason, score.
- Deduplicate candidates whose time ranges overlap heavily.
- In smart mode, run a second reduce step to select the best 5-8 highlights.
- In fast mode, select top candidates without second reduce.
- Enforce each highlight duration between 30 and 90 seconds if possible.
- Never fabricate quotes.
- If AI returns invalid JSON, retry once with a stricter repair prompt.

Acceptance criteria:
- API returns 5-8 timestamped highlights for a normal transcript.
- Highlight cards can seek the YouTube player to start time.
- Bad AI output does not crash the app.
- Typecheck and lint pass.