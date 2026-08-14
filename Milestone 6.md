- Milestone 6: Implement transcript-grounded summary generation.

  Add:
  - app/api/generate-summary/route.ts
  - lib/ai/prompts/summary.ts
  - lib/ai/schemas/summary.ts
  - components/summary-panel.tsx

  Input:
  {
    videoId: string
    title?: string
    transcript: TranscriptSegment[]
  }

  Output:
  {
    overview: string
    keyTakeaways: string[]
    sections: {
      title: string
      start: number
      end: number
      bullets: string[]
    }[]
    memorableQuotes: {
      quote: string
      start: number
    }[]
  }

  Rules:
  - Summary must be based only on transcript.
  - If transcript is too long, chunk it first and summarize chunks, then synthesize final summary.
  - Do not invent facts.
  - Include timestamps when possible.
  - Validate AI output with Zod.
  - Return fallback summary if AI provider fails, but clearly mark it as fallback.

  Acceptance criteria:
  - Summary panel renders overview, takeaways, sections, and quotes.
  - Large transcripts do not exceed model context because chunking is used.
  - Typecheck and lint pass.