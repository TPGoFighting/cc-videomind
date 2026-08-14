# TeachPlayer — Tauri v2 Desktop Skeleton

This folder is the **Tauri v2** desktop shell for TeachPlayer ("方案 A": a local
desktop build of the Next.js YouTube AI learning tool). The frontend stays a
plain Next.js app; Tauri wraps the static export in a native window and provides
the OS-level capabilities the browser can't (yt-dlp sidecar, a CORS-free AI
proxy, secure key storage).

> ⚠️ **Status: scaffold only — NOT compiled.** This Mac has no Rust/cargo, so
> nothing here has been built or run. The code is written to Tauri v2 APIs and
> *should* compile once the prerequisites below are installed, but treat it as
> unverified until you run `tauri build`.

## What this layer does

| Concern | Where | Why |
| --- | --- | --- |
| Subtitles | `fetch_transcript` → yt-dlp sidecar (`--cookies-from-browser chrome`, `--sub-format json3`) | Browser can't run yt-dlp or read local cookies; Rust spawns it and parses the JSON3. |
| AI calls | `ai_proxy` → reqwest → longcat base url | longcat does **not** send `Access-Control-Allow-Origin`, so browser fetch is CORS-blocked. Proxied from Rust instead. |
| API key | `secure_get` / `secure_set` → tauri-plugin-store (`settings.json`) | Key is read in Rust, never embedded in frontend JS. |
| Local DB | sql.js runs **inside the webview** (WASM) | Rust only needs fs permission to the app data dir; no Rust SQL. |

## Three core commands (frontend ↔ Rust bridge)

- `fetch_transcript(url_or_id: String, lang: String) -> Result<Vec<TranscriptSegment>, String>`
  Spawns the `yt-dlp` sidecar into `<appData>/transcripts`, downloads the JSON3
  subtitle, parses it (Rust port of `lib/youtube/transcript-provider.ts`
  `parseJson3Captions` + a sentence-merge equivalent of `mergeIntoSentences`),
  returns `[{start_time, end_time, text}]`, then deletes the temp file.

- `ai_proxy(method, path, headers, body) -> Result<String, String>`
  Forwards to `<AI_API_BASE_URL><path>` via reqwest. Injects the stored key
  under the header named by `AI_API_KEY_HEADER` (default `Authorization`) with
  prefix `AI_API_KEY_PREFIX` (default `Bearer `). Honors `AI_API_BASE_URL` from
  the environment. Returns the raw response body.

- `secure_get(key)` / `secure_set(key, value)` — thin wrappers over
  `tauri-plugin-store`. `get_app_data_dir()` returns the app data path.

## Build prerequisites

1. **Install Rust** (toolchain + the Tauri CLI):
   ```sh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   cargo install tauri-cli --version "^2"
   ```
2. **Install the frontend deps** (do this in the repo root, *not* here):
   ```sh
   npm install
   ```
   The Next.js app must be configured for static export
   (`output: 'export'` in `next.config.ts`) so Tauri's `frontendDist: ../out`
   resolves. That config is owned by another agent — do not add it here.
3. **Provide the app icons.** Tauri refuses to build without
   `src-tauri/icons/*`. Generate placeholders once:
   ```sh
   npx tauri icon ./public/icon.png   # or drop any PNG in and run tauri icon
   ```
4. **Download the yt-dlp sidecars** into `src-tauri/binaries/` — one per target
   (see `src-tauri/binaries/README.md`). Filenames must match
   `tauri.conf.json → bundle.externalBin`.
5. **Set the AI base url**, e.g. in the launch environment:
   ```sh
   export AI_API_BASE_URL="https://api.longcat.chat/anthropic"
   ```
   The API key is entered in the app UI and stored via `secure_set`.

## Build / run

```sh
# Dev (expects the Next dev server on http://localhost:3100 — devUrl)
cargo tauri dev
# or, if you add the npm scripts below: npm run tauri:dev

# Production build → platform installers in src-tauri/target/release/bundle
cargo tauri build
# or: npm run tauri:build
```

### Suggested npm scripts (add these yourself — package.json is owned by another agent)

```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

## Notes / follow-ups

- **CORS is the reason `ai_proxy` exists.** Verified: longcat's responses carry
  no `Access-Control-Allow-Origin`, so a browser `fetch` from the webview is
  blocked. Routing through Rust (same-origin to the OS) sidesteps it entirely
  and keeps the key server-side.
- **Store encryption** uses the default tauri-plugin-store (unencrypted JSON).
  For a real release, build the store with `.encrypted()` + a device-bound
  password before shipping.
- **sql.js storage** is fully in the webview; this Rust side only grants fs
  scope to `$APPDATA/**` so the DB file can live in the app data dir.
