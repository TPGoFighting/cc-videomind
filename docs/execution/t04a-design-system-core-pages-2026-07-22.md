# T04A Design System and Core Pages — 2026-07-22

## Outcome

T04A's code-side design pass is complete. Authentication, explore, video workspace, review, navigation, legal pages, and shared UI primitives now use the same cold-ink surface system, one ice-blue action accent, readable text hierarchy, 44px action targets, explicit state copy, and consistent Chinese navigation terms.

This is not a release claim. Five-user comprehension testing, complete keyboard traversal, runtime reduced-motion emulation, real Android/iOS flows, and self-service account deletion remain open gates.

## Safe visual test seam

`/video/eIho2S0ZahI?fixture=<state>` supports these development-only states:

- `ready`: metadata, bilingual transcript, analysis, key moments, and takeaways.
- `loading`: fixed source metadata plus transcript/analysis skeletons and an explicit stage message.
- `empty`: no transcript, an honest empty explanation, and a route to reviewed videos.
- `partial`: transcript remains usable while deeper analysis reports temporary unavailability.
- `failure`: caption failure, translated recovery guidance, alternative video action, and source check.

The fixture is schema-tested and disabled in production builds. It does not load the YouTube player or call transcript, word-definition, or paid AI endpoints.

## Browser evidence

The in-app browser exercised `http://localhost:3200` at nominal 1440×900, 1024×900, and 390×844 viewports. Its engine version was not exposed, so this evidence must not be described as a named-device check.

Verified interactions:

- `/login?next=%2Freview`: H1/value explanation, password show/hide, retained return path.
- `/login?next=https%3A%2F%2Fexample.com`: unsafe external return path rejected; registration link also drops it.
- `/register?next=%2Freview`: password mismatch marks both fields, missing policy acceptance links an alert to the checkbox, and the mobile bottom bar is absent.
- `/explore`: all three reviewed videos display language, level, duration, captions, and outcome; the `技术` filter leaves only the 3Blue1Brown item.
- `/review`: signed-out three-step onboarding is visible and the login CTA keeps `/review`; all five mobile navigation targets measure 44px high.
- `/video/<fixture>`: all five states have zero horizontal overflow and zero iframe; visible desktop/mobile tabs measure 44px high.
- Workspace tab switching preserves an unfinished question (`Which habit builds trust?`) after switching to transcript and back.
- `/privacy`: the page exposes six sections and explicitly states the missing self-service export/deletion capability.

No new browser console `warn` or `error` was recorded after `2026-07-22T11:24:30.738Z` during the redesigned route pass.

## Screenshots

Pre-change authentication/explore/review screenshots are in `docs/execution/t04a-baseline/` (12 files). Final route screenshots are in `docs/execution/t04a-final/`:

- login, register, explore, review, and ready video workspace at 1440, 1024, and 390 widths;
- video loading, empty, partial, and failure states at 1440 width;
- privacy at 390 and terms at 1440.

The current homepage evidence remains `docs/execution/t04-home-{1440,1024,390}.png` from T04. Homepage Taste source files predated the T00 ownership baseline and remain deliberately excluded from the T04A commit.

## Quality evidence

- `npm run lint`: pass, zero warnings.
- `npm run typecheck`: pass after moving the stopped development server's stale `.next` cache to `/private/tmp/cc-videomind-next-t04a-20260722`.
- `npm test`: 151/151 pass, including catalog, return-path, SEO, and workspace-fixture contracts.
- `npm run build`: production build pass; `/privacy`, `/terms`, and all existing application routes generated successfully.

## Open gates

- Recruit five target users and record the 10-second product-comprehension result.
- Run a complete keyboard-order and focus-visible pass in a controllable desktop browser.
- Emulate `prefers-reduced-motion: reduce` at runtime; the CSS fallback exists but was not emulated by the available browser surface.
- Complete input → parse → transcript jump → save → review on physical Chrome Android and iOS Safari.
- Implement account export/deletion and a durable support channel in T06 before public registration is released.
