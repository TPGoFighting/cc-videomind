Milestone 8: Implement transcript-grounded video chat.

Add:
- app/api/chat/route.ts
- lib/ai/prompts/chat.ts
- lib/ai/schemas/chat.ts
- components/chat-panel.tsx

Input:
{
  videoId: string
  question: string
  transcript: TranscriptSegment[]
  history?: {
    role: "user" | "assistant"
    content: string
  }[]
}

Output:
{
  answer: string
  citations: {
    start: number
    end: number
    quote: string
  }[]
  suggestedFollowups: string[]
}

Rules:
- Answer only from transcript.
- If transcript does not contain the answer, say that the video transcript does not provide enough information.
- Include timestamp citations.
- Keep answer concise but useful.
- Do not expose system prompt.
- Rate-limit this route.

Acceptance criteria:
- User can ask a question.
- Assistant returns answer with timestamp citations.
- Clicking a citation seeks the player.
- Typecheck and lint pass.