- Milestone 11: Add optional paid transcript fallback provider.

  Add:
  - lib/transcript/paid-transcript-provider.ts

  Behavior:
  - /api/transcript first tries YouTube caption provider.
  - If YouTube returns NO_TRANSCRIPT, do not call paid provider unless PAID_TRANSCRIPT_FALLBACK_FOR_NO_TRANSCRIPT=true.
  - If YouTube returns YOUTUBE_BLOCKED or FETCH_FAILED, use paid provider if PAID_TRANSCRIPT_API_KEY exists.
  - Mark source as "paid".
  - Add cost-aware logging.

  Environment variables:
  - PAID_TRANSCRIPT_PROVIDER
  - PAID_TRANSCRIPT_API_KEY
  - PAID_TRANSCRIPT_BASE_URL
  - PAID_TRANSCRIPT_FALLBACK_FOR_NO_TRANSCRIPT

  Requirements:
  - Keep provider interface unchanged.
  - Add clear errors for provider quota exhausted and invalid API key.
  - Do not call paid provider in local development unless explicitly enabled.

  Acceptance criteria:
  - Free YouTube provider remains first choice.
  - Paid fallback only runs under configured conditions.
  - Typecheck and lint pass.