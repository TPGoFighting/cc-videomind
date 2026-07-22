# Teach Player Design System

Teach Player is a focused bilingual video-learning workspace, not a generic AI showcase. The product should feel calm, precise, and trustworthy enough for long reading sessions.

## Product hierarchy

Every core page should make these layers obvious:

1. **Primary task** — paste a YouTube knowledge video, read alongside the video, or complete today's review.
2. **Understanding** — bilingual transcript, summary, key moments, and source timestamps.
3. **Action** — save a word or sentence, write a note, ask a sourced question, and return for review.

Decoration, motion, and marketing claims must never compete with the current task.

## Visual language

- Canvas: cold ink black `#080B0F`.
- Surfaces: `#0C131C` and raised `#111A25`.
- Text: primary `#F4F7FA`, secondary `#B8C3CE`, muted `#9AA8B7`, faint `#718090` only for nonessential copy.
- Border: `rgba(166, 190, 214, 0.18)`; stronger interactive border uses `0.32`.
- Primary accent: ice blue `#5BA8FF`. It is the only action accent. Green, amber, and red are reserved for success, warning, and error.
- No purple/pink gradients, decorative glass stacks, fabricated metrics, or equally weighted competing CTAs.

The CSS variables live in `app/globals.css`; TypeScript consumers use `lib/design/tokens.ts`.

## Typography

- UI/body: Satoshi, Avenir Next, PingFang SC, then system sans-serif.
- Reading text defaults to 16px with 1.65 line height; supporting labels never fall below 14px when they carry meaning.
- Display headings use weight 600–650, tight but readable tracking, and balanced wrapping.
- Monospace is reserved for timestamps, IDs, and diagnostic values.

## Components

- Touch targets are at least 44×44px.
- Inputs and primary buttons are 52–56px tall on acquisition and authentication flows.
- Standard cards use 10–14px radii; 20px is reserved for large workspaces and dialogs. Pills are used for compact filters or status, not every container.
- Focus is always visible with a 2px ice-blue outline and must not rely on color alone.
- Loading, empty, partial-success, and error states explain what happened and the next safe action.
- Destructive actions are visible on touch screens and require confirmation or undo.

## Layout

- Marketing and exploration pages: maximum 1440px, editorial split where a real product surface can carry the visual weight.
- Forms: use a two-column value + action shell on desktop and one column on tablet/mobile.
- Workspace: video and transcript remain primary; secondary tools must not shrink the reading area below a usable width.
- Mobile pages reserve the bottom safe area for navigation and never hide a required action behind the fixed tab bar.

## Motion

- Fast feedback: 120ms; normal transitions: 200ms; deliberate reveals: at most 360ms.
- Animations may explain hierarchy but cannot delay input, hide content indefinitely, or block keyboard interaction.
- `prefers-reduced-motion: reduce` disables looping and scroll-driven motion while preserving all content and controls.

## Content rules

- Use real, verified example videos or label mock content as `界面示例`.
- Do not show user counts, completion claims, review streaks, roadmap status, or provider availability without an auditable source.
- Public recommendations must show language, suggested level, duration, subtitle availability, and a concrete learning outcome.
- Terms such as `字幕`, `要点`, `问答`, `笔记`, `保存`, and `今日复习` stay consistent across desktop and mobile.

## Release checks

- Final screenshots at 1440×900, 1024×900, and 390×844 for every core route.
- No horizontal overflow, clipped copy, unexplained blank state, framework overlay, or new console error.
- WCAG AA text contrast, visible keyboard focus, reduced-motion verification, and 44px touch targets.
- Real Chrome Android and iOS Safari evidence remains required before public release.
