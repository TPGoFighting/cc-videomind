- Milestone 5: Implement AI provider adapter architecture.

  Create:
  - lib/ai/types.ts
  - lib/ai/provider.ts
  - lib/ai/openai-compatible-provider.ts
  - lib/ai/gemini-provider.ts, only if GEMINI_API_KEY exists or package is installed
  - lib/ai/index.ts
  - lib/ai/errors.ts

  Provider interface:
  generateText(input: {
    system: string
    prompt: string
    temperature?: number
    maxTokens?: number
  }): Promise<AITextResult>

  generateJson<T>(input: {
    system: string
    prompt: string
    schemaName: string
    jsonSchema: object
    temperature?: number
    maxTokens?: number
  }): Promise<T>

  Requirements:
  - Select provider from AI_PROVIDER env.
  - Support OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, OPENAI_COMPATIBLE_MODEL.
  - Handle timeout, 401, 429, 500, malformed JSON.
  - Strip markdown code fences before JSON parsing.
  - Add a repairJson helper only as a last resort.
  - Never put API keys in client code.
  - Add tests for JSON extraction.

  Acceptance criteria:
  - A server-side function can generate plain text.
  - A server-side function can generate schema-validated JSON.
  - Errors are typed and user-safe.
  - Typecheck and lint pass.