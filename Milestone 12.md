Milestone 12: Add security middleware and rate limiting for expensive routes.

Create:
- lib/security/with-api-guard.ts
- lib/security/rate-limit.ts
- lib/security/errors.ts

Protect routes:
- /api/transcript
- /api/video-analysis
- /api/generate-summary
- /api/chat
- /api/stripe/create-checkout-session

Requirements:
- Validate HTTP method.
- Validate content-type for POST routes.
- Apply body size limit.
- Apply per-IP rate limit for anonymous users.
- Apply per-user rate limit for signed-in users.
- Add safe error responses.
- Add security headers where appropriate.
- Do not break Stripe webhook raw body signature verification.

Acceptance criteria:
- Expensive routes are rate-limited.
- Stripe webhook still verifies signature correctly.
- Typecheck and lint pass.