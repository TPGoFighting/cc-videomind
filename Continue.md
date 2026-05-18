We are building VideoMind. Read CLAUDE.md first.

Current milestone:
Implement AI provider adapter architecture.

Before editing:
1. Inspect the current project structure.
2. Identify existing conventions.
3. Propose a concise implementation plan.

Then implement:
- lib/ai/types.ts
- lib/ai/provider.ts
- lib/ai/openai-compatible-provider.ts
- lib/ai/index.ts
- lib/ai/errors.ts
- tests for JSON parsing if test setup exists

Constraints:
- No client-side API keys.
- All AI JSON output must be schema-validated.
- Provider selection must come from env.
- Error types must be safe to return from API routes.
- Do not touch unrelated UI files.

After editing:
- Run npm run typecheck.
- Run npm run lint.
- Fix any failures.
- Summarize changed files and remaining TODOs.