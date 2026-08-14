# T04A Core Page and State Matrix — 2026-07-22

This matrix defines what must be visible before a core page can be considered designed. Automated visual checks use stable local state and must not call paid AI, payment systems, production accounts, or production user data.

| Route | Default | Loading | Empty | Partial success | Failure | Signed out |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Promise, URL input, three outcomes, labelled workspace preview | Input remains usable; no full-screen animation gate | Not applicable | Subtitle-first expectation while AI results follow | Inline URL error retaining input | Full acquisition flow remains available |
| `/login` | Value explanation plus email/password form | Submit label and disabled state; form remains legible | Not applicable | Not applicable | Linked alert with recovery action | Default state; preserve safe `next` path |
| `/register` | Save/sync/review value plus account form | Submit label and disabled state | Not applicable | Account created and safe return path | Password mismatch, weak password, API alert | Default state; policy acceptance required before release |
| `/explore` | Stable curated learning cards and filters | Fixed-size skeleton only when needed | Explain curation and provide URL entry | Thumbnail failure must not remove metadata | Retry or use direct URL action | Fully accessible |
| `/video/<fixture>` | Video + transcript primary, understanding and action secondary | Transcript skeleton with explicit stage | Explain missing captions and alternatives | Transcript usable while AI panels are pending/unavailable | Error code translated into a next action; URL retained | Reading allowed where possible; saving returns through login |
| `/review` | Due items and progress only after the first saved item | Review-card skeleton | Three-step `保存 → 明日出现 → 回到出处` explanation | Completed items remain visible if check-in refresh fails | Retry with non-silent status | Explain benefit before login and preserve `/review` return |

## Baseline capture

Before changing authentication, explore, and review code, 1440×900, 1024×900, and 390×844 screenshots were saved under `docs/execution/t04a-baseline/`. No baseline video-workspace screenshot was taken because the current route automatically proceeds from transcript loading to paid analysis; T04A must first add a deterministic fixture seam.

## Implemented in T04A

- Authentication now has a single H1, concrete save/sync/review value, password visibility, linked alerts, safe `next` handling, policy confirmation, and accessible `/terms` and `/privacy` pages.
- Explore now uses a three-item manually reviewed learning catalog with stable local metadata, learning filters, and no client-side oEmbed request.
- Review explains the first-save loop before displaying performance metrics and preserves `/review` through login.
- The video workspace now has deterministic `ready`, `loading`, `empty`, `partial`, and `failure` fixtures. Fixtures are development-only, schema-validated, and skip the player, transcript, word-definition, and AI requests.
- Desktop and mobile workspace tabs use the same Chinese labels and remain mounted while switching so transcript scroll and unfinished question/note inputs are not discarded.
- Notes expose delete on touch, require a second confirmation action, and report load/save/delete failures instead of failing silently.

## Release gaps

- Five-user comprehension testing, full keyboard-order traversal, runtime reduced-motion emulation, and real Chrome Android/iOS Safari flows still require external/manual evidence.
- The privacy page deliberately states that self-service export and account deletion are not yet implemented; T06 must provide those rights before public release.
- Baseline video-workspace capture was intentionally omitted because the old route immediately made live transcript/AI calls. The post-change fixture is the first safe deterministic capture surface.
