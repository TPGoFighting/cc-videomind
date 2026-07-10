//! TeachPlayer Tauri v2 application entry point.
//!
//! Commands exposed to the frontend:
//!   * `fetch_transcript(url_or_id, lang)` — run yt-dlp (sidecar) for subtitles.
//!   * `ai_proxy(method, path, headers, body)` — forward to the AI base URL.
//!   * `secure_get(key)` / `secure_set(key, value)` — wrap tauri-plugin-store.
//!   * `get_app_data_dir()` — path to the app's local data directory.

mod ai;
mod transcript;

use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const AI_KEY: &str = "AI_API_KEY";

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("store error: {0}")]
    Store(String),
    #[error("shell error: {0}")]
    Shell(String),
    #[error("{0}")]
    Any(String),
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ─── fetch_transcript ───────────────────────────────────────────────────────

#[tauri::command]
async fn fetch_transcript(
    app: AppHandle,
    url_or_id: String,
    lang: String,
) -> Result<Vec<transcript::TranscriptSegment>, String> {
    let work_dir = app
        .path()
        .app_data_dir()
        .map_err(err)?
        .join("transcripts");
    std::fs::create_dir_all(&work_dir).map_err(err)?;

    let target = normalize_url(&url_or_id);
    let sub_lang = if lang.is_empty() { "en".to_string() } else { lang };

    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| err(e))?;

    let output_template = work_dir.join("subs.%(ext)s");
    let args = [
        target.as_str(),
        "--cookies-from-browser",
        "chrome",
        "--write-auto-subs",
        "--sub-lang",
        sub_lang.as_str(),
        "--sub-format",
        "json3",
        "--skip-download",
        "--no-warnings",
        "--quiet",
        "-o",
        output_template.to_str().unwrap_or("subs.%(ext)s"),
    ];

    let (mut rx, _child) = sidecar
        .args(args)
        .spawn()
        .map_err(|e| format!("failed to spawn yt-dlp sidecar: {e}"))?;

    let mut stderr_log = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(bytes) => {
                stderr_log.push_str(&String::from_utf8_lossy(&bytes));
            }
            CommandEvent::Error(e) => {
                stderr_log.push_str(&e);
            }
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }

    // yt-dlp writes `<id>.en.json3` (auto subs). Find the first json3 produced.
    let json3 = find_json3(&work_dir)
        .ok_or_else(|| format!("yt-dlp produced no json3 subtitle. stderr: {stderr_log}"))?;

    let content = std::fs::read_to_string(&json3).map_err(err)?;
    let segments = transcript::parse_json3(&content);

    // Clean up the temp file; the parsed result is what matters.
    let _ = std::fs::remove_file(&json3);

    if segments.is_empty() {
        return Err(format!(
            "parsed 0 transcript segments (lang={sub_lang}). stderr: {stderr_log}"
        ));
    }
    Ok(segments)
}

fn find_json3(dir: &std::path::Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json3") {
            return Some(path);
        }
    }
    None
}

fn normalize_url(url_or_id: &str) -> String {
    let s = url_or_id.trim();
    if s.starts_with("http://") || s.starts_with("https://") {
        return s.to_string();
    }
    // bare 11-char YouTube id or any v= param handling
    if let Some(rest) = s.strip_prefix("v=") {
        return format!("https://www.youtube.com/watch?v={rest}");
    }
    format!("https://www.youtube.com/watch?v={s}")
}

// ─── ai_proxy ───────────────────────────────────────────────────────────────

#[tauri::command]
async fn ai_proxy(
    app: AppHandle,
    method: String,
    path: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
) -> Result<String, String> {
    let base_url = std::env::var("AI_API_BASE_URL").unwrap_or_default();
    let api_key = read_store_string(&app, AI_KEY)?;
    ai::proxy(&base_url, &api_key, &method, &path, &headers, body).await
}

// ─── secure store ───────────────────────────────────────────────────────────

#[tauri::command]
fn secure_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let store = app.store(STORE_FILE).map_err(err)?;
    Ok(store
        .get(&key)
        .and_then(|v| v.as_str().map(|s| s.to_string())))
}

#[tauri::command]
fn secure_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(err)?;
    let val: Value = Value::String(value);
    store.set(key, val);
    store.save().map_err(err)?;
    Ok(())
}

fn read_store_string(app: &AppHandle, key: &str) -> Result<String, String> {
    let store = app.store(STORE_FILE).map_err(err)?;
    Ok(store
        .get(key)
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default())
}

// ─── app data dir ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> String {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default()
}

// ─── builder ────────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fetch_transcript,
            ai_proxy,
            secure_get,
            secure_set,
            get_app_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running TeachPlayer");
}
