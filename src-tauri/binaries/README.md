# yt-dlp sidecar binaries

Tauri bundles these as `externalBin`. One file per target triple — Tauri strips
the `-<target_triple>` suffix to derive the sidecar name `yt-dlp`, which is what
`fetch_transcript` spawns.

Required filenames (must match `tauri.conf.json → bundle.externalBin`):

| File | Platform |
| --- | --- |
| `yt-dlp-x86_64-apple-darwin` | macOS Intel |
| `yt-dlp-aarch64-apple-darwin` | macOS Apple Silicon |
| `yt-dlp-x86_64-pc-windows-msvc.exe` | Windows x64 |
| `yt-dlp-x86_64-unknown-linux-gnu` | Linux x64 |

## Download

```sh
# macOS (both arches)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o yt-dlp-aarch64-apple-darwin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o yt-dlp-x86_64-apple-darwin
chmod +x yt-dlp-aarch64-apple-darwin yt-dlp-x86_64-apple-darwin

# Windows
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp-x86_64-pc-windows-msvc.exe

# Linux
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp-x86_64-unknown-linux-gnu
chmod +x yt-dlp-x86_64-unknown-linux-gnu
```

The sidecar runs with `--cookies-from-browser chrome`, so the host machine
needs Google Chrome installed for age-restricted / members-only transcripts.
