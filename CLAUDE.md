# Teach Player Agent Instructions

## Product
Teach Player is an original YouTube AI learning workspace. Users paste a YouTube URL and receive transcript, summary, highlights, timestamped chat answers, and personal notes.

Do not copy LongCut source code, UI, branding, product text, or assets. Implement clean-room equivalents.

## Stack
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth + Postgres
- Stripe Checkout + Webhook
- AI provider adapters

## Commands
Use these commands before claiming completion:
- npm run typecheck
- npm run lint
- npm run test, if tests exist
- npm run build, before major PRs

## Coding Standards
- TypeScript strict mode.
- No `any` unless unavoidable. If used, explain why.
- Validate all API inputs with Zod.
- API routes must return typed JSON responses.
- External API calls must use timeout and structured errors.
- Never leak environment variables to client components.
- Keep server-only logic in `lib/server` or API routes.
- Use provider interfaces for YouTube, AI, transcript, and payment integrations.
- Keep prompts in separate files or clearly named functions.
- All AI outputs must be schema-validated before use.

## Security
- Never trust client-provided userId.
- Use Supabase server client to identify authenticated user.
- Verify Stripe webhook signatures.
- Add idempotency for Stripe events.
- Rate-limit expensive API routes.
- Apply body size limits for API routes.
- Do not store raw secrets in code.

## AI Output Rules
- Summary must be grounded only in transcript.
- Highlights must include startTime, endTime, title, quote, and reason.
- Chat answers must cite timestamp ranges.
- If transcript is missing, AI routes must fail gracefully.
- Never fabricate quotes.

## Git Workflow
- Implement one milestone per commit.
- Do not mix formatting-only changes with feature changes.
- Before final response, summarize changed files and tests run.

## UI Direction
Clean, modern, student-friendly learning workspace.
Avoid copying any existing app’s exact visual design.
Prioritize clarity over heavy animation.