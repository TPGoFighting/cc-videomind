Milestone 3: Implement transcript provider architecture.

Create:
- lib/transcript/types.ts
- lib/transcript/transcript-provider.ts
- lib/transcript/mock-transcript-provider.ts
- lib/transcript/index.ts
- app/api/transcript/route.ts
- components/transcript-viewer.tsx

Transcript segment type:
{
  id: string
  start: number
  duration: number
  end: number
  text: string
}

Provider interface:
getTranscript(input: {
  videoId: string
  language?: string
}): Promise<TranscriptResult>

TranscriptResult:
{
  videoId: string
  language: string
  source: "mock" | "youtube" | "paid"
  segments: TranscriptSegment[]
  fetchedAt: string
}

For now:
- Implement mock provider that returns realistic timestamped transcript segments.
- API route uses mock provider unless TRANSCRIPT_PROVIDER is set.
- Transcript viewer displays clickable timestamp rows.
- Clicking a transcript row should update the player start time if feasible; if not, create a TODO with clear interface.

Acceptance criteria:
- /api/transcript returns timestamped segments.
- Workspace displays transcript.
- Code is designed so a real YouTube provider can be plugged in later.
- Typecheck and lint pass.