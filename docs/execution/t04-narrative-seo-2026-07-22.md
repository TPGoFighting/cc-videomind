# T04 Narrative, SEO, and Taste Homepage Evidence — 2026-07-22

## Outcome

The local implementation now presents one primary ToC promise for Chinese learners: paste a public YouTube knowledge video and receive bilingual subtitles, traceable learning points, and a path to review. The homepage no longer renders unsupported aggregate statistics or roadmap completion claims. The example workspace and citation are explicitly labelled as interface examples.

The primary example action opens `/video/eIho2S0ZahI`. It is a real public TED video route; the mock workspace itself remains labelled `界面示例` so sample transcript copy is not represented as extracted production data.

## SEO contract

- Canonical production origin: `https://video.tpgofighting.top`.
- Public index routes: `/` and `/explore`.
- Account, generated workspace, and user-content routes use `noindex, nofollow` and are excluded from the sitemap.
- `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest` returned successful bodies from the local production-compatible server.
- Open Graph and Twitter images resolve to the absolute production URL `https://video.tpgofighting.top/share-image`.
- `/share-image` rendered a real PNG at 1200×630 in the browser.

Browser metadata checks:

| Route | Canonical | Robots |
| --- | --- | --- |
| `/` | `https://video.tpgofighting.top` | `index, follow` |
| `/explore` | `https://video.tpgofighting.top/explore` | `index, follow` |
| `/login` | `https://video.tpgofighting.top/login` | `noindex, nofollow` |
| `/video/eIho2S0ZahI` | `https://video.tpgofighting.top/video/eIho2S0ZahI` | `noindex, nofollow` |

## Responsive browser evidence

Browser: Codex in-app Chromium, local Next.js development server, 2026-07-22.

| Viewport | Result | Artifact |
| --- | --- | --- |
| 1440×900 | Two-column hero visible, one H1, no horizontal overflow | `docs/execution/t04-home-1440.png` |
| 1024×900 | Hero switches to one column at 68rem; the previous clipped headline and description are fixed | `docs/execution/t04-home-1024.png` |
| 390×844 | Single-column hero, input and CTA visible, fixed bottom navigation does not cover the primary action, no horizontal overflow | `docs/execution/t04-home-390.png` |

Verified interactions without paid AI or production accounts:

- `字幕 → 摘要 → 复习` changes the selected tab and panel content.
- The example play control changes to `暂停示例视频`.
- The learning-scenario carousel advances from `英文访谈 01/03` to `技术课程 02/03` after entering the scroll-triggered section.
- An unsupported URL remains in the field and displays the linked Chinese alert `请输入有效的 YouTube 公开视频链接。`; the field exposes `aria-invalid=true` and `aria-describedby`.
- Mobile bottom navigation contains four 64×44 targets, and unauthenticated protected destinations consistently resolve to `/login`.
- The isolated homepage run produced no browser console warning or error.

## Quality gates

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: 146/146 pass, including three SEO contract tests.
- `npm run build`: pass; the build emits `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and `/share-image`.

## Honest limits and follow-up

- The 5-person, 10-second comprehension acceptance requires real target users and is not claimed complete.
- The automation surface did not expose a reliable full-page keyboard focus traversal or reduced-motion emulation; the CSS fallback exists, but these two runtime checks remain open in T04A.
- Route traversal surfaced two Next.js LCP image warnings on `/explore`; they belong to the cross-page T04A pass and remain open.
- Real Chrome Android and iOS Safari flows are not verified.
- Homepage Taste files were already protected uncommitted work at the T00 baseline. This task must not stage them without separately resolving that ownership boundary; the screenshots reflect the current working tree.
